import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Radio, Mic, MicOff, Users, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface JamUser {
  id: string;
  username: string;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
}

interface LiveJamSessionProps {
  userId: string;
  samples: Array<{ id: string; name: string; blob: Blob }>;
}

export const LiveJamSession = ({ userId, samples }: LiveJamSessionProps) => {
  const [roomCode, setRoomCode] = useState('');
  const [isInSession, setIsInSession] = useState(false);
  const [users, setUsers] = useState<JamUser[]>([]);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      leaveSession();
    };
  }, []);

  const joinSession = async () => {
    if (!roomCode.trim()) {
      toast.error('Enter a room code');
      return;
    }

    try {
      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      }

      // Join Supabase Realtime channel
      const channel = supabase.channel(`jam_${roomCode}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      channelRef.current = channel;

      // Track user presence
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const presentUsers: JamUser[] = [];
          
          Object.keys(state).forEach((key) => {
            state[key].forEach((presence: any) => {
              presentUsers.push({
                id: presence.id,
                username: presence.username || 'User',
                isPlaying: presence.isPlaying || false,
                isMuted: presence.isMuted || false,
                volume: presence.volume || 1,
              });
            });
          });
          
          setUsers(presentUsers);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('User joined:', newPresences);
          toast.success(`${newPresences[0]?.username || 'User'} joined the session`);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('User left:', leftPresences);
          toast.info(`${leftPresences[0]?.username || 'User'} left the session`);
        })
        .on('broadcast', { event: 'play_sample' }, ({ payload }) => {
          handleRemoteSamplePlay(payload);
        })
        .on('broadcast', { event: 'webrtc_offer' }, ({ payload }) => {
          handleWebRTCOffer(payload);
        })
        .on('broadcast', { event: 'webrtc_answer' }, ({ payload }) => {
          handleWebRTCAnswer(payload);
        })
        .on('broadcast', { event: 'webrtc_ice' }, ({ payload }) => {
          handleWebRTCICE(payload);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              id: userId,
              username: `User-${userId.slice(0, 6)}`,
              isPlaying: false,
              isMuted: false,
              volume: 1,
            });
            setIsInSession(true);
            toast.success('Joined jam session!');
          }
        });

    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Failed to join session');
    }
  };

  const leaveSession = async () => {
    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    setIsInSession(false);
    setUsers([]);
    setIsMicEnabled(false);
    toast.info('Left jam session');
  };

  const toggleMicrophone = async () => {
    if (!isMicEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        localStreamRef.current = stream;
        setIsMicEnabled(true);

        // Create peer connections for all users
        users.forEach((user) => {
          if (user.id !== userId) {
            createPeerConnection(user.id, stream);
          }
        });

        toast.success('Microphone enabled');
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast.error('Failed to access microphone');
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      setIsMicEnabled(false);
      toast.info('Microphone disabled');
    }
  };

  const createPeerConnection = async (remoteUserId: string, stream: MediaStream) => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);
    peerConnectionsRef.current.set(remoteUserId, pc);

    // Add local stream tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      playRemoteAudio(remoteStream);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_ice',
          payload: {
            from: userId,
            to: remoteUserId,
            candidate: event.candidate,
          },
        });
      }
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_offer',
        payload: {
          from: userId,
          to: remoteUserId,
          offer: offer,
        },
      });
    }
  };

  const handleWebRTCOffer = async ({ from, to, offer }: any) => {
    if (to !== userId) return;

    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);
    peerConnectionsRef.current.set(from, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      playRemoteAudio(remoteStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_ice',
          payload: {
            from: userId,
            to: from,
            candidate: event.candidate,
          },
        });
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_answer',
        payload: {
          from: userId,
          to: from,
          answer: answer,
        },
      });
    }
  };

  const handleWebRTCAnswer = async ({ from, to, answer }: any) => {
    if (to !== userId) return;

    const pc = peerConnectionsRef.current.get(from);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleWebRTCICE = async ({ from, to, candidate }: any) => {
    if (to !== userId) return;

    const pc = peerConnectionsRef.current.get(from);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const playRemoteAudio = (stream: MediaStream) => {
    const audio = new Audio();
    audio.srcObject = stream;
    audio.play().catch((error) => console.error('Error playing remote audio:', error));
  };

  const handleRemoteSamplePlay = async ({ sampleId, userId: remoteUserId }: any) => {
    console.log(`User ${remoteUserId} is playing sample ${sampleId}`);
    toast.info(`Remote user playing sample`);
  };

  const playSampleInSession = async (sampleId: string) => {
    if (!channelRef.current || !isInSession) return;

    await channelRef.current.send({
      type: 'broadcast',
      event: 'play_sample',
      payload: {
        sampleId,
        userId,
        timestamp: Date.now(),
      },
    });

    // Update presence
    await channelRef.current.track({
      id: userId,
      username: `User-${userId.slice(0, 6)}`,
      isPlaying: true,
      isMuted,
      volume: 1,
    });
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Live Jam Session</h3>
      </div>

      {!isInSession ? (
        <div className="space-y-4">
          <Input
            id="live-jam-room-code"
            name="live-jam-room-code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter room code (e.g., JAM2024)"
            className="bg-background/50"
            aria-label="Enter room code (e.g., JAM2024)"
          />
          <Button onClick={joinSession} className="w-full">
            Join Session
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="gap-2">
              <Users className="w-3 h-3" />
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </Badge>
            <div className="flex gap-2">
              <Button
                variant={isMicEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={toggleMicrophone}
              >
                {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>
              <Button
                variant={isMuted ? 'outline' : 'default'}
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 rounded bg-background/30"
              >
                <span className="text-sm">{user.username}</span>
                <div className="flex items-center gap-2">
                  {user.isPlaying && (
                    <Badge variant="secondary" className="text-xs">
                      Playing
                    </Badge>
                  )}
                  {user.isMuted && <VolumeX className="w-3 h-3 text-muted-foreground" />}
                </div>
              </div>
            ))}
          </div>

          <Button onClick={leaveSession} variant="outline" className="w-full">
            Leave Session
          </Button>
        </div>
      )}
    </Card>
  );
};
