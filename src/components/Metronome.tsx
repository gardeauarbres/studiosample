import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Volume2, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Metronome = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [volume, setVolume] = useState(0.5);
  const [currentBeat, setCurrentBeat] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIdRef = useRef<number | null>(null);
  const beatCountRef = useRef(0);

  useEffect(() => {
    audioContextRef.current = new AudioContext();
    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
      }
      audioContextRef.current?.close();
    };
  }, []);

  const scheduleNote = (time: number, beatNumber: number) => {
    if (!audioContextRef.current) return;

    const osc = audioContextRef.current.createOscillator();
    const envelope = audioContextRef.current.createGain();

    osc.frequency.value = beatNumber === 0 ? 1000 : 800;
    envelope.gain.value = volume;
    envelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    osc.connect(envelope);
    envelope.connect(audioContextRef.current.destination);

    osc.start(time);
    osc.stop(time + 0.1);

    setCurrentBeat(beatNumber);
  };

  const scheduler = () => {
    if (!audioContextRef.current) return;

    const lookahead = 0.1;
    const scheduleAheadTime = 0.1;

    while (nextNoteTimeRef.current < audioContextRef.current.currentTime + scheduleAheadTime) {
      const beatsPerBar = parseInt(timeSignature.split('/')[0]);
      scheduleNote(nextNoteTimeRef.current, beatCountRef.current);
      
      const secondsPerBeat = 60.0 / bpm;
      nextNoteTimeRef.current += secondsPerBeat;
      beatCountRef.current = (beatCountRef.current + 1) % beatsPerBar;
    }
  };

  const start = () => {
    if (!audioContextRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    beatCountRef.current = 0;
    nextNoteTimeRef.current = audioContextRef.current.currentTime;
    
    timerIdRef.current = window.setInterval(() => scheduler(), 25);
    setIsPlaying(true);
  };

  const stop = () => {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(0);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  };

  const beatsPerBar = parseInt(timeSignature.split('/')[0]);

  return (
    <Card className="p-4 bg-card/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Metronome</h3>
          </div>
          
          <Button
            onClick={togglePlay}
            variant={isPlaying ? "secondary" : "default"}
            className="gap-2"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start
              </>
            )}
          </Button>
        </div>

        {/* Beat Indicator */}
        <div className="flex gap-2 justify-center">
          {Array.from({ length: beatsPerBar }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "w-12 h-12 rounded-full border-2 transition-all duration-100",
                isPlaying && currentBeat === idx
                  ? idx === 0
                    ? "bg-primary border-primary scale-110"
                    : "bg-secondary border-secondary scale-110"
                  : "border-border"
              )}
            />
          ))}
        </div>

        {/* BPM Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Tempo (BPM)</Label>
            <span className="text-2xl font-bold font-mono">{bpm}</span>
          </div>
          <Slider
            id="bpm-slider"
            name="bpm"
            value={[bpm]}
            onValueChange={([value]) => setBpm(value)}
            min={40}
            max={240}
            step={1}
            className="w-full"
            aria-label="Tempo (BPM)"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>40</span>
            <span>120</span>
            <span>240</span>
          </div>
        </div>

        {/* Time Signature */}
        <div className="space-y-2">
          <Label htmlFor="time-signature-select">Time Signature</Label>
          <Select value={timeSignature} onValueChange={setTimeSignature}>
            <SelectTrigger id="time-signature-select" aria-label="Time Signature">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2/4">2/4</SelectItem>
              <SelectItem value="3/4">3/4</SelectItem>
              <SelectItem value="4/4">4/4</SelectItem>
              <SelectItem value="5/4">5/4</SelectItem>
              <SelectItem value="6/8">6/8</SelectItem>
              <SelectItem value="7/8">7/8</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <Label>Volume: {Math.round(volume * 100)}%</Label>
          </div>
          <Slider
            id="metronome-volume-slider"
            name="metronome-volume"
            value={[volume]}
            onValueChange={([value]) => setVolume(value)}
            min={0}
            max={1}
            step={0.01}
            className="w-full"
            aria-label="Volume"
          />
        </div>
      </div>
    </Card>
  );
};
