import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  Radio, Mic, MicOff, Users, Volume2, VolumeX, 
  MessageCircle, Play, Pause, Headphones, Settings, Music, Download 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SharedSample {
  id: string;
  name: string;
  userId: string;
  username: string;
  blobData: string;
  mimeType: string;
  timestamp: number;
}

interface Participant {
  id: string;
  username: string;
  isPlaying: boolean;
  isMuted: boolean;
  isTalking: boolean;
  volume: number;
  latency: number;
  isOnline: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  sampleData?: {
    id: string;
    name: string;
    blobData: string;
    mimeType: string;
  };
}

interface RealtimeCollaborativeStudioProps {
  userId: string;
  samples: Array<{ id: string; name: string; blob: Blob }>;
  onSamplePlay: (sampleId: string) => void;
}

export const RealtimeCollaborativeStudio = ({ 
  userId, 
  samples,
  onSamplePlay 
}: RealtimeCollaborativeStudioProps) => {
  const [roomCode, setRoomCode] = useState('');
  const [isInSession, setIsInSession] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map());
  const [sharedSamples, setSharedSamples] = useState<SharedSample[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [selectedSampleForChat, setSelectedSampleForChat] = useState<string | null>(null);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState([100]);
  const [audioQuality, setAudioQuality] = useState<'low' | 'medium' | 'high'>('high');
  
  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Stop remote audio elements
    remoteAudioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    remoteAudioElementsRef.current.clear();

    // Close audio context
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  };

  const joinSession = async () => {
    if (!roomCode.trim()) {
      toast.error('Entrez un code de salle');
      return;
    }

    try {
      // Fetch current user's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      const currentUsername = profileData?.username || `User-${userId.slice(0, 6)}`;

      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ 
          sampleRate: audioQuality === 'high' ? 48000 : audioQuality === 'medium' ? 44100 : 22050,
          latencyHint: 'interactive'
        });
      }

      // Join Supabase Realtime channel
      const channel = supabase.channel(`studio_${roomCode}`, {
        config: {
          presence: {
            key: userId,
          },
          broadcast: {
            self: true,
          },
        },
      });

      channelRef.current = channel;

      // Track user presence
      channel
        .on('presence', { event: 'sync' }, async () => {
          const state = channel.presenceState();
          const presentUsers: Participant[] = [];
          const userIds: string[] = [];
          
          Object.keys(state).forEach((key) => {
            state[key].forEach((presence: any) => {
              userIds.push(presence.id);
              presentUsers.push({
                id: presence.id,
                username: presence.username || 'User',
                isPlaying: presence.isPlaying || false,
                isMuted: presence.isMuted || false,
                isTalking: presence.isTalking || false,
                volume: presence.volume || 1,
                latency: presence.latency || 0,
                isOnline: true,
              });
            });
          });

          // Fetch all usernames from profiles
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username')
              .in('id', userIds);

            const newUsernames = new Map(usernames);
            profiles?.forEach(profile => {
              newUsernames.set(profile.id, profile.username || `User-${profile.id.slice(0, 6)}`);
            });
            setUsernames(newUsernames);

            // Update presentUsers with real usernames
            presentUsers.forEach(user => {
              const realUsername = newUsernames.get(user.id);
              if (realUsername) {
                user.username = realUsername;
              }
            });
          }
          
          setParticipants(presentUsers);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('Participant joined:', newPresences);
          const username = usernames.get(newPresences[0]?.id) || newPresences[0]?.username || 'User';
          toast.success(`${username} a rejoint la session`);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('Participant left:', leftPresences);
          const username = usernames.get(leftPresences[0]?.id) || leftPresences[0]?.username || 'User';
          toast.info(`${username} a quitté la session`);
          
          // Clean up peer connection
          const leftUserId = leftPresences[0]?.id;
          if (leftUserId) {
            const pc = peerConnectionsRef.current.get(leftUserId);
            if (pc) {
              pc.close();
              peerConnectionsRef.current.delete(leftUserId);
            }
            
            const audio = remoteAudioElementsRef.current.get(leftUserId);
            if (audio) {
              audio.pause();
              audio.srcObject = null;
              remoteAudioElementsRef.current.delete(leftUserId);
            }
          }
        })
        .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
          handleChatMessage(payload);
        })
        .on('broadcast', { event: 'sample_play' }, ({ payload }) => {
          handleRemoteSamplePlay(payload);
        })
        .on('broadcast', { event: 'sample_stop' }, ({ payload }) => {
          handleRemoteSampleStop(payload);
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
        .on('broadcast', { event: 'sample_share' }, ({ payload }) => {
          handleSampleShare(payload);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              id: userId,
              username: currentUsername,
              isPlaying: false,
              isMuted: false,
              isTalking: false,
              volume: 1,
              latency: 0,
              isOnline: true,
            });
            setIsInSession(true);
            toast.success('Connecté au studio collaboratif!');
          }
        });

    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Échec de la connexion');
    }
  };

  const leaveSession = async () => {
    await cleanup();
    setIsInSession(false);
    setParticipants([]);
    setSharedSamples([]);
    setChatMessages([]);
    setIsMicEnabled(false);
    toast.info('Session quittée');
  };

  const toggleMicrophone = async () => {
    if (!isMicEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: audioQuality === 'high' ? 48000 : 44100,
          },
        });
        
        localStreamRef.current = stream;
        setIsMicEnabled(true);

        // Set up analyser for voice activity detection
        if (audioContextRef.current) {
          const source = audioContextRef.current.createMediaStreamSource(stream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          source.connect(analyserRef.current);
          
          detectVoiceActivity();
        }

        // Create peer connections for all participants
        participants.forEach((participant) => {
          if (participant.id !== userId) {
            createPeerConnection(participant.id, stream);
          }
        });

        toast.success('Microphone activé');
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast.error('Impossible d\'accéder au microphone');
      }
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      setIsMicEnabled(false);
      updatePresence({ isTalking: false });
      toast.info('Microphone désactivé');
    }
  };

  const detectVoiceActivity = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const checkActivity = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      const isTalking = average > 30; // Threshold for voice activity
      updatePresence({ isTalking });
      
      animationFrameRef.current = requestAnimationFrame(checkActivity);
    };
    
    checkActivity();
  };

  const createPeerConnection = async (remoteUserId: string, stream: MediaStream) => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
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
      playRemoteAudio(remoteUserId, remoteStream);
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

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${remoteUserId}:`, pc.connectionState);
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
      playRemoteAudio(from, remoteStream);
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

  const playRemoteAudio = (remoteUserId: string, stream: MediaStream) => {
    let audio = remoteAudioElementsRef.current.get(remoteUserId);
    
    if (!audio) {
      audio = new Audio();
      audio.autoplay = true;
      remoteAudioElementsRef.current.set(remoteUserId, audio);
    }
    
    audio.srcObject = stream;
    audio.volume = masterVolume[0] / 100;
    audio.play().catch((error) => console.error('Error playing remote audio:', error));
  };

  const handleChatMessage = (payload: any) => {
    const newMessage: ChatMessage = {
      id: `${payload.userId}-${payload.timestamp}`,
      userId: payload.userId,
      username: payload.username,
      message: payload.message,
      timestamp: payload.timestamp,
      sampleData: payload.sampleData,
    };
    
    setChatMessages((prev) => [...prev, newMessage]);
    
    if (payload.userId !== userId) {
      if (payload.sampleData) {
        toast.info(`${payload.username} a partagé "${payload.sampleData.name}"`);
      } else {
        toast.info(`${payload.username}: ${payload.message.slice(0, 30)}...`);
      }
    }
  };

  const sendChatMessage = async () => {
    if ((!messageInput.trim() && !selectedSampleForChat) || !channelRef.current) return;

    let sampleData = null;
    
    if (selectedSampleForChat) {
      const sample = samples.find(s => s.id === selectedSampleForChat);
      if (sample) {
        // Convert blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(sample.blob);
        });
        
        const base64data = await base64Promise;
        sampleData = {
          id: sample.id,
          name: sample.name,
          blobData: base64data,
          mimeType: sample.blob.type,
        };
      }
    }

    await channelRef.current.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: {
        userId,
        username: usernames.get(userId) || `User-${userId.slice(0, 6)}`,
        message: messageInput || (sampleData ? `📁 ${sampleData.name}` : ''),
        timestamp: Date.now(),
        sampleData,
      },
    });

    setMessageInput('');
    setSelectedSampleForChat(null);
  };

  const handleRemoteSamplePlay = async ({ sampleId, userId: remoteUserId, timestamp }: any) => {
    console.log(`User ${remoteUserId} started playing sample ${sampleId} at ${timestamp}`);
    toast.info(`Participant joue un sample`);
  };

  const handleRemoteSampleStop = async ({ userId: remoteUserId }: any) => {
    console.log(`User ${remoteUserId} stopped playing`);
  };

  const playSampleInSession = async (sampleId: string) => {
    if (!channelRef.current || !isInSession) return;

    const timestamp = Date.now();
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'sample_play',
      payload: {
        sampleId,
        userId,
        timestamp,
      },
    });

    updatePresence({ isPlaying: true });
    onSamplePlay(sampleId);
  };

  const stopPlayingInSession = async () => {
    if (!channelRef.current || !isInSession) return;

    await channelRef.current.send({
      type: 'broadcast',
      event: 'sample_stop',
      payload: {
        userId,
        timestamp: Date.now(),
      },
    });

    updatePresence({ isPlaying: false });
  };

  const shareSample = async (sampleId: string) => {
    if (!channelRef.current || !isInSession) return;

    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      
      await channelRef.current!.send({
        type: 'broadcast',
        event: 'sample_share',
        payload: {
          id: sampleId,
          name: sample.name,
          userId,
          username: usernames.get(userId) || `User-${userId.slice(0, 6)}`,
          blobData: base64data,
          mimeType: sample.blob.type,
          timestamp: Date.now(),
        },
      });

      toast.success('Sample partagé avec la session');
    };
    
    reader.readAsDataURL(sample.blob);
  };

  const handleSampleShare = (payload: SharedSample) => {
    if (payload.userId === userId) return;
    
    setSharedSamples(prev => {
      if (prev.some(s => s.id === payload.id && s.userId === payload.userId)) {
        return prev;
      }
      return [...prev, payload];
    });
    
    toast.info(`${payload.username} a partagé "${payload.name}"`);
  };

  const saveSharedSample = async (sharedSample: SharedSample) => {
    try {
      const { error } = await supabase.from('samples').insert({
        user_id: userId,
        name: `${sharedSample.name} (de ${sharedSample.username})`,
        blob_data: sharedSample.blobData,
        mime_type: sharedSample.mimeType,
        duration: 0,
        timestamp: Date.now(),
      });

      if (error) throw error;

      toast.success('Sample sauvegardé dans votre bibliothèque');
    } catch (error) {
      console.error('Error saving shared sample:', error);
      toast.error('Erreur lors de la sauvegarde du sample');
    }
  };

  const saveSampleFromChat = async (sampleData: { id: string; name: string; blobData: string; mimeType: string }, senderUsername: string) => {
    try {
      const { error } = await supabase.from('samples').insert({
        user_id: userId,
        name: `${sampleData.name} (de ${senderUsername})`,
        blob_data: sampleData.blobData,
        mime_type: sampleData.mimeType,
        duration: 0,
        timestamp: Date.now(),
      });

      if (error) throw error;

      toast.success('Sample sauvegardé dans votre bibliothèque');
    } catch (error) {
      console.error('Error saving sample from chat:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const updatePresence = async (updates: Partial<Participant>) => {
    if (!channelRef.current) return;

    const currentUser = participants.find(p => p.id === userId) || {
      id: userId,
      username: usernames.get(userId) || `User-${userId.slice(0, 6)}`,
      isPlaying: false,
      isMuted: false,
      isTalking: false,
      volume: 1,
      latency: 0,
      isOnline: true,
    };

    await channelRef.current.track({
      ...currentUser,
      ...updates,
      isOnline: true,
    });
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-lg border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-5 h-5 text-primary animate-pulse" />
        <h3 className="font-semibold text-lg">Studio Collaboratif Temps Réel</h3>
      </div>

      {!isInSession ? (
        <div className="space-y-4">
          <Input
            id="room-code"
            name="room-code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Code de salle (ex: JAM2024)"
            className="bg-background/50"
            aria-label="Code de salle (ex: JAM2024)"
          />
          <Button onClick={joinSession} className="w-full">
            Rejoindre le Studio
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="participants" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="participants">
              <Users className="w-4 h-4 mr-1" />
              Participants
            </TabsTrigger>
            <TabsTrigger value="samples">
              <Play className="w-4 h-4 mr-1" />
              Samples
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageCircle className="w-4 h-4 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-1" />
              Contrôles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="participants" className="space-y-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="outline" className="gap-2">
                <Users className="w-3 h-3" />
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/30 backdrop-blur border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      participant.isOnline ? 'bg-green-500' : 'bg-red-500'
                    }`} 
                    title={participant.isOnline ? 'En ligne' : 'Hors ligne'}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{participant.username}</span>
                      {participant.isTalking && (
                        <span className="text-xs text-muted-foreground">En train de parler...</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {participant.isPlaying && (
                      <Badge variant="secondary" className="text-xs">
                        <Play className="w-3 h-3 mr-1" />
                        Joue
                      </Badge>
                    )}
                    {participant.isMuted && <VolumeX className="w-3 h-3 text-muted-foreground" />}
                    {!participant.isMuted && participant.isTalking && (
                      <Volume2 className="w-3 h-3 text-green-500 animate-pulse" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="samples" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Mes samples à partager:</label>
                <Badge variant="outline">{samples.length} disponibles</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                {samples.slice(0, 10).map((sample) => (
                  <div
                    key={sample.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-background/30 backdrop-blur border border-border/50"
                  >
                    <span className="text-sm truncate flex-1">{sample.name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => playSampleInSession(sample.id)}
                        className="h-7 px-2"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => shareSample(sample.id)}
                        className="h-7 px-2"
                      >
                        Partager
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Samples partagés:</label>
                  <Badge variant="secondary">{sharedSamples.length} reçus</Badge>
                </div>
                {sharedSamples.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun sample partagé pour le moment
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto">
                    {sharedSamples.map((sample) => (
                      <div
                        key={`${sample.userId}-${sample.id}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-accent/20 backdrop-blur border border-primary/20"
                      >
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{sample.name}</span>
                          <span className="text-xs text-muted-foreground">par {sample.username}</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => saveSharedSample(sample)}
                          className="h-7 px-2 ml-2"
                        >
                          Sauvegarder
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="space-y-4 mt-4">
            <div className="space-y-2 h-[300px] overflow-y-auto p-3 bg-background/20 rounded-lg">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun message. Commencez la conversation !
                </p>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded ${
                      msg.userId === userId ? 'bg-primary/20 ml-8' : 'bg-accent/20 mr-8'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-medium">{msg.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {msg.sampleData ? (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-background/40 rounded border border-primary/30">
                        <Music className="w-4 h-4 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{msg.sampleData.name}</p>
                          <p className="text-xs text-muted-foreground">Sample audio</p>
                        </div>
                        {msg.userId !== userId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveSampleFromChat(msg.sampleData!, msg.username)}
                            className="h-7 px-2"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{msg.message}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {selectedSampleForChat && (
              <div className="flex items-center gap-2 p-2 bg-accent/20 rounded border border-primary/30">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-sm flex-1">
                  {samples.find(s => s.id === selectedSampleForChat)?.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSampleForChat(null)}
                  className="h-6 px-2"
                >
                  ✕
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const sampleId = samples[0]?.id;
                  if (sampleId) setSelectedSampleForChat(selectedSampleForChat ? null : sampleId);
                }}
                className="px-2"
                aria-label="Attacher un sample au message"
              >
                <Music className="w-4 h-4" />
              </Button>
              <Input
                id="chat-message-input"
                name="chat-message-input"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Votre message..."
                className="flex-1"
                aria-label="Votre message..."
              />
              <Button onClick={sendChatMessage} aria-label="Envoyer le message">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>

            {!selectedSampleForChat && samples.length > 0 && (
              <div className="grid grid-cols-2 gap-1 max-h-[120px] overflow-y-auto p-2 bg-background/10 rounded">
                {samples.slice(0, 6).map((sample) => (
                  <Button
                    key={sample.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSampleForChat(sample.id)}
                    className="justify-start text-xs h-7"
                  >
                    <Music className="w-3 h-3 mr-1" />
                    {sample.name.slice(0, 12)}...
                  </Button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Audio</label>
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
                    onClick={() => {
                      setIsMuted(!isMuted);
                      updatePresence({ isMuted: !isMuted });
                    }}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="master-volume-slider">Volume général: {masterVolume[0]}%</label>
                <Slider
                  id="master-volume-slider"
                  name="master-volume"
                  value={masterVolume}
                  onValueChange={(value) => {
                    setMasterVolume(value);
                    remoteAudioElementsRef.current.forEach((audio) => {
                      audio.volume = value[0] / 100;
                    });
                  }}
                  min={0}
                  max={100}
                  step={1}
                  aria-label="Volume général"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Qualité audio</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((quality) => (
                    <Button
                      key={quality}
                      variant={audioQuality === quality ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAudioQuality(quality)}
                      className="flex-1"
                    >
                      {quality === 'low' && 'Basse'}
                      {quality === 'medium' && 'Moyenne'}
                      {quality === 'high' && 'Haute'}
                    </Button>
                  ))}
                </div>
              </div>

              <Button onClick={leaveSession} variant="destructive" className="w-full">
                Quitter le Studio
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </Card>
  );
};
