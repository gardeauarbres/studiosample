import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Play, Pause, Square, Download, Sliders, Volume2, PanelLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Track {
  id: string;
  name: string;
  blob: Blob;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  audioBuffer: AudioBuffer | null;
}

interface MultiTrackMixerProps {
  samples: Array<{ id: string; name: string; blob: Blob }>;
}

export const MultiTrackMixer = ({ samples }: MultiTrackMixerProps) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [isOpen, setIsOpen] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const trackSourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const trackGainsRef = useRef<Map<string, GainNode>>(new Map());
  const trackPannersRef = useRef<Map<string, StereoPannerNode>>(new Map());
  const masterGainRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.connect(audioContextRef.current.destination);
    }
  }, []);

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = masterVolume;
    }
  }, [masterVolume]);

  useEffect(() => {
    const loadTracks = async () => {
      const loadedTracks = await Promise.all(
        samples.map(async (sample) => {
          const audioContext = new AudioContext();
          const arrayBuffer = await sample.blob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          return {
            id: sample.id,
            name: sample.name,
            blob: sample.blob,
            volume: 0.7,
            pan: 0,
            muted: false,
            solo: false,
            audioBuffer
          };
        })
      );
      setTracks(loadedTracks);
    };

    if (samples.length > 0) {
      loadTracks();
    }
  }, [samples]);

  const updateTrack = (trackId: string, updates: Partial<Track>) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, ...updates } : track
    ));

    // Update audio nodes if playing
    if (isPlaying) {
      const gainNode = trackGainsRef.current.get(trackId);
      const panNode = trackPannersRef.current.get(trackId);
      
      if (gainNode && updates.volume !== undefined) {
        gainNode.gain.value = updates.muted ? 0 : updates.volume;
      }
      
      if (panNode && updates.pan !== undefined) {
        panNode.pan.value = updates.pan;
      }
    }
  };

  const playAll = async () => {
    if (!audioContextRef.current || !masterGainRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const hasSolo = tracks.some(t => t.solo);

    tracks.forEach(track => {
      if (!track.audioBuffer) return;

      const shouldPlay = hasSolo ? track.solo : !track.muted;
      if (!shouldPlay) return;

      const source = audioContextRef.current!.createBufferSource();
      source.buffer = track.audioBuffer;
      source.loop = true;

      const gainNode = audioContextRef.current!.createGain();
      gainNode.gain.value = track.volume;

      const panNode = audioContextRef.current!.createStereoPanner();
      panNode.pan.value = track.pan;

      source.connect(gainNode);
      gainNode.connect(panNode);
      panNode.connect(masterGainRef.current!);

      source.start(0);

      trackSourcesRef.current.set(track.id, source);
      trackGainsRef.current.set(track.id, gainNode);
      trackPannersRef.current.set(track.id, panNode);
    });

    startTimeRef.current = audioContextRef.current.currentTime;
    setIsPlaying(true);
  };

  const stopAll = () => {
    trackSourcesRef.current.forEach(source => source.stop());
    trackSourcesRef.current.clear();
    trackGainsRef.current.clear();
    trackPannersRef.current.clear();
    setIsPlaying(false);
  };

  const exportMix = async () => {
    if (!audioContextRef.current || tracks.length === 0) return;

    toast.info('Exporting mix...');

    try {
      // Find the longest track duration
      const maxDuration = Math.max(...tracks.map(t => t.audioBuffer?.duration || 0));
      const sampleRate = 44100;
      
      // Create offline context
      const offlineContext = new OfflineAudioContext(
        2,
        maxDuration * sampleRate,
        sampleRate
      );

      const masterGain = offlineContext.createGain();
      masterGain.gain.value = masterVolume;
      masterGain.connect(offlineContext.destination);

      const hasSolo = tracks.some(t => t.solo);

      tracks.forEach(track => {
        if (!track.audioBuffer) return;
        
        const shouldInclude = hasSolo ? track.solo : !track.muted;
        if (!shouldInclude) return;

        const source = offlineContext.createBufferSource();
        source.buffer = track.audioBuffer;

        const gainNode = offlineContext.createGain();
        gainNode.gain.value = track.volume;

        const panNode = offlineContext.createStereoPanner();
        panNode.pan.value = track.pan;

        source.connect(gainNode);
        gainNode.connect(panNode);
        panNode.connect(masterGain);

        source.start(0);
      });

      const renderedBuffer = await offlineContext.startRendering();

      // Convert to WAV
      const wav = audioBufferToWav(renderedBuffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mix_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Mix exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export mix');
    }
  };

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    let pos = 0;

    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(pos++, str.charCodeAt(i));
      }
    };

    writeString('RIFF');
    view.setUint32(pos, length - 8, true); pos += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(pos, 16, true); pos += 4;
    view.setUint16(pos, 1, true); pos += 2;
    view.setUint16(pos, buffer.numberOfChannels, true); pos += 2;
    view.setUint32(pos, buffer.sampleRate, true); pos += 4;
    view.setUint32(pos, buffer.sampleRate * buffer.numberOfChannels * 2, true); pos += 4;
    view.setUint16(pos, buffer.numberOfChannels * 2, true); pos += 2;
    view.setUint16(pos, 16, true); pos += 2;
    writeString('data');
    view.setUint32(pos, length - pos - 4, true); pos += 4;

    const channels = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 0;
    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return arrayBuffer;
  };

  if (samples.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sliders className="w-4 h-4" />
          Multi-Track Mixer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            Multi-Track Mixer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transport Controls */}
          <Card className="p-4 bg-card/50">
            <div className="flex items-center gap-3">
              <Button
                onClick={isPlaying ? stopAll : playAll}
                className="gap-2"
                disabled={tracks.length === 0}
              >
                {isPlaying ? (
                  <>
                    <Square className="w-4 h-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Play All
                  </>
                )}
              </Button>
              
              <div className="flex-1" />
              
              <div className="flex items-center gap-3 min-w-[200px]">
                <Volume2 className="w-4 h-4" />
                <Label className="text-xs whitespace-nowrap">
                  Master: {Math.round(masterVolume * 100)}%
                </Label>
                <Slider
                  id="master-volume-slider"
                  name="master-volume"
                  value={[masterVolume]}
                  onValueChange={([value]) => setMasterVolume(value)}
                  min={0}
                  max={1}
                  step={0.01}
                  className="flex-1"
                  aria-label="Master Volume"
                />
              </div>

              <Button onClick={exportMix} variant="secondary" className="gap-2">
                <Download className="w-4 h-4" />
                Export Mix
              </Button>
            </div>
          </Card>

          {/* Tracks */}
          <div className="space-y-3">
            {tracks.map((track) => (
              <Card key={track.id} className="p-4 bg-card/30 hover:bg-card/50 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{track.name}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">M</Label>
                      <Switch
                        checked={track.muted}
                        onCheckedChange={(checked) => 
                          updateTrack(track.id, { muted: checked })
                        }
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">S</Label>
                      <Switch
                        checked={track.solo}
                        onCheckedChange={(checked) => 
                          updateTrack(track.id, { solo: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-2">
                        <Volume2 className="w-3 h-3" />
                        Volume: {Math.round(track.volume * 100)}%
                      </Label>
                      <Slider
                        id={`track-${track.id}-volume-slider`}
                        name={`track-${track.id}-volume`}
                        value={[track.volume]}
                        onValueChange={([value]) => 
                          updateTrack(track.id, { volume: value })
                        }
                        min={0}
                        max={1}
                        step={0.01}
                        disabled={track.muted}
                        aria-label={`Volume ${track.name}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-2">
                        <PanelLeft className="w-3 h-3" />
                        Pan: {track.pan > 0 ? 'R' : track.pan < 0 ? 'L' : 'C'}
                        {track.pan !== 0 && ` ${Math.abs(Math.round(track.pan * 100))}`}
                      </Label>
                      <Slider
                        id={`track-${track.id}-pan-slider`}
                        name={`track-${track.id}-pan`}
                        value={[track.pan]}
                        onValueChange={([value]) => 
                          updateTrack(track.id, { pan: value })
                        }
                        min={-1}
                        max={1}
                        step={0.01}
                        aria-label={`Pan ${track.name}`}
                      />
                    </div>
                  </div>

                  <div className={cn(
                    "h-2 rounded-full bg-secondary overflow-hidden",
                    isPlaying && !track.muted && "animate-pulse"
                  )}>
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ 
                        width: track.muted ? '0%' : `${track.volume * 100}%`,
                        opacity: track.solo ? 1 : 0.7
                      }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {tracks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Add samples to start mixing
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
