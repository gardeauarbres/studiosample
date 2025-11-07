import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Sparkles, RotateCw } from 'lucide-react';

interface AudioEffectsProps {
  audioBlob: Blob | null;
  onApplyEffect: (effectBlob: Blob, effectName: string) => void;
}

export const AudioEffects = ({ audioBlob, onApplyEffect }: AudioEffectsProps) => {
  const [pitch, setPitch] = useState(0);
  const [reverb, setReverb] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const applyPitchShift = async () => {
    if (!audioBlob) return;
    
    setIsProcessing(true);
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate * Math.pow(2, pitch / 12)
      );
      
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = Math.pow(2, pitch / 12);
      source.connect(offlineContext.destination);
      source.start();
      
      const renderedBuffer = await offlineContext.startRendering();
      const wav = audioBufferToWav(renderedBuffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      
      const effectName = pitch > 0 ? `Pitch +${pitch}` : `Pitch ${pitch}`;
      onApplyEffect(blob, effectName);
    } catch (error) {
      console.error('Error applying pitch shift:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyReverb = async () => {
    if (!audioBlob) return;
    
    setIsProcessing(true);
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length + audioContext.sampleRate * 2,
        audioBuffer.sampleRate
      );
      
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const convolver = offlineContext.createConvolver();
      const reverbBuffer = createReverbImpulse(offlineContext, reverb);
      convolver.buffer = reverbBuffer;
      
      const dry = offlineContext.createGain();
      const wet = offlineContext.createGain();
      
      dry.gain.value = 1 - (reverb / 100);
      wet.gain.value = reverb / 100;
      
      source.connect(dry);
      source.connect(convolver);
      convolver.connect(wet);
      
      dry.connect(offlineContext.destination);
      wet.connect(offlineContext.destination);
      
      source.start();
      
      const renderedBuffer = await offlineContext.startRendering();
      const wav = audioBufferToWav(renderedBuffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      
      onApplyEffect(blob, `Reverb ${reverb}%`);
    } catch (error) {
      console.error('Error applying reverb:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const createReverbImpulse = (context: OfflineAudioContext, duration: number) => {
    const length = context.sampleRate * (duration / 50);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    
    return impulse;
  };

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // WAV header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt "
    setUint32(16);
    setUint16(1);
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
    setUint16(buffer.numberOfChannels * 2);
    setUint16(16);
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    const channels: Float32Array[] = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

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

  return (
    <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6 border-2 border-border bg-card/80 backdrop-blur">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Effets Audio</h3>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Pitch</label>
            <span className="text-sm font-medium text-primary">{pitch > 0 ? '+' : ''}{pitch}</span>
          </div>
          <Slider
            id="pitch-slider"
            name="pitch"
            value={[pitch]}
            onValueChange={(value) => setPitch(value[0])}
            min={-12}
            max={12}
            step={1}
            disabled={!audioBlob || isProcessing}
            className="touch-none"
            aria-label="Pitch"
          />
          <Button
            onClick={applyPitchShift}
            disabled={!audioBlob || isProcessing || pitch === 0}
            className="w-full h-11 touch-none"
            variant="secondary"
          >
            {isProcessing ? (
              <RotateCw className="h-4 w-4 animate-spin" />
            ) : (
              'Appliquer Pitch'
            )}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Reverb</label>
            <span className="text-sm font-medium text-primary">{reverb}%</span>
          </div>
          <Slider
            id="reverb-slider"
            name="reverb"
            value={[reverb]}
            onValueChange={(value) => setReverb(value[0])}
            min={0}
            max={100}
            step={10}
            disabled={!audioBlob || isProcessing}
            className="touch-none"
            aria-label="Reverb"
          />
          <Button
            onClick={applyReverb}
            disabled={!audioBlob || isProcessing || reverb === 0}
            className="w-full h-11 touch-none"
            variant="secondary"
          >
            {isProcessing ? (
              <RotateCw className="h-4 w-4 animate-spin" />
            ) : (
              'Appliquer Reverb'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
