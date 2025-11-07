import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoopPlayerProps {
  audioBlob: Blob;
  name: string;
}

export const LoopPlayer = ({ audioBlob, name }: LoopPlayerProps) => {
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceRef = useRef<string | null>(null);

  useEffect(() => {
    // Create audio element
    const url = URL.createObjectURL(audioBlob);
    sourceRef.current = url;
    
    const audio = new Audio(url);
    audio.loop = true;
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (sourceRef.current) {
        URL.revokeObjectURL(sourceRef.current);
      }
    };
  }, [audioBlob]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isLooping) {
      audioRef.current.pause();
      setIsLooping(false);
    } else {
      audioRef.current.play();
      setIsLooping(true);
    }
  };

  const restart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
  };

  return (
    <Card className="border-border bg-card/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm truncate flex-1">{name}</h4>
          <div className="flex gap-2">
            <Button
              onClick={togglePlay}
              size="sm"
              variant={isLooping ? "secondary" : "default"}
              className="gap-2"
            >
              {isLooping ? (
                <>
                  <Pause className="w-3 h-3" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Loop
                </>
              )}
            </Button>
            <Button
              onClick={restart}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <RotateCw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">
              Vitesse: {playbackRate.toFixed(2)}x
            </Label>
            <Slider
              value={[playbackRate]}
              onValueChange={([value]) => setPlaybackRate(value)}
              min={0.5}
              max={2}
              step={0.05}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              Volume: {Math.round(volume * 100)}%
            </Label>
            <Slider
              value={[volume]}
              onValueChange={([value]) => setVolume(value)}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
          </div>
        </div>

        <div className={cn(
          "h-1 rounded-full bg-secondary overflow-hidden",
          isLooping && "animate-pulse"
        )}>
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: isLooping ? '100%' : '0%' }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
