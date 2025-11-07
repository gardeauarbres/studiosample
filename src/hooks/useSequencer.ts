import { useState, useRef, useCallback, useEffect } from 'react';

export interface SequencerStep {
  id: number;
  active: boolean;
  sampleId?: string;
}

export interface SequencerTrack {
  id: string;
  name: string;
  sampleId?: string;
  steps: SequencerStep[];
  sampleBlob?: Blob;
}

export const useSequencer = (steps: number = 16, bpm: number = 120) => {
  const [tracks, setTracks] = useState<SequencerTrack[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBpm, setCurrentBpm] = useState(bpm);
  const [quantize, setQuantize] = useState(true);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const stepDuration = (60 / currentBpm / 4) * 1000; // Duration in ms for each step

  const addTrack = useCallback((name: string, sampleBlob?: Blob, sampleId?: string) => {
    const newTrack: SequencerTrack = {
      id: Date.now().toString(),
      name,
      sampleId,
      steps: Array.from({ length: steps }, (_, i) => ({
        id: i,
        active: false,
      })),
      sampleBlob,
    };
    
    setTracks(prev => [...prev, newTrack]);
    
    // Load audio buffer for this track
    if (sampleBlob && audioContextRef.current) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result && audioContextRef.current) {
          const arrayBuffer = e.target.result as ArrayBuffer;
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          audioBuffersRef.current.set(newTrack.id, audioBuffer);
        }
      };
      reader.readAsArrayBuffer(sampleBlob);
    }
  }, [steps]);

  const removeTrack = useCallback((trackId: string) => {
    setTracks(prev => prev.filter(t => t.id !== trackId));
    audioBuffersRef.current.delete(trackId);
  }, []);

  const updateTrackSample = useCallback((trackId: string, name: string, sampleBlob: Blob, sampleId: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, name, sampleBlob, sampleId } : track
    ));

    // Load new audio buffer
    if (audioContextRef.current) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result && audioContextRef.current) {
          const arrayBuffer = e.target.result as ArrayBuffer;
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          audioBuffersRef.current.set(trackId, audioBuffer);
        }
      };
      reader.readAsArrayBuffer(sampleBlob);
    }
  }, []);

  const toggleStep = useCallback((trackId: string, stepId: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        return {
          ...track,
          steps: track.steps.map(step =>
            step.id === stepId ? { ...step, active: !step.active } : step
          ),
        };
      }
      return track;
    }));
  }, []);

  const playStep = useCallback((step: number) => {
    if (!audioContextRef.current) return;

    tracks.forEach(track => {
      if (track.steps[step]?.active) {
        const buffer = audioBuffersRef.current.get(track.id);
        if (buffer) {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContextRef.current!.destination);
          source.start(0);
        }
      }
    });
  }, [tracks]);

  const start = useCallback(() => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    setCurrentStep(0);
    
    intervalRef.current = setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = (prev + 1) % steps;
        playStep(nextStep);
        return nextStep;
      });
    }, stepDuration);
  }, [isPlaying, steps, stepDuration, playStep]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    setTracks([]);
    audioBuffersRef.current.clear();
    stop();
  }, [stop]);

  const setBpm = useCallback((newBpm: number) => {
    setCurrentBpm(newBpm);
    
    // Restart interval if playing
    if (isPlaying && intervalRef.current) {
      clearInterval(intervalRef.current);
      const newStepDuration = (60 / newBpm / 4) * 1000;
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1) % steps;
          playStep(nextStep);
          return nextStep;
        });
      }, newStepDuration);
    }
  }, [isPlaying, steps, playStep]);

  return {
    tracks,
    currentStep,
    isPlaying,
    bpm: currentBpm,
    quantize,
    addTrack,
    removeTrack,
    updateTrackSample,
    toggleStep,
    start,
    stop,
    pause,
    clear,
    setBpm,
    setQuantize,
  };
};
