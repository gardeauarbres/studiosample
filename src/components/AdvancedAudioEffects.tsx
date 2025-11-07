import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Waves, Volume2, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface AdvancedAudioEffectsProps {
  audioBlob: Blob | null;
  onEffectApplied: (blob: Blob, effectName: string) => void;
}

export const AdvancedAudioEffects = ({ audioBlob, onEffectApplied }: AdvancedAudioEffectsProps) => {
  const [spatialX, setSpatialX] = useState([0]);
  const [spatialY, setSpatialY] = useState([0]);
  const [spatialZ, setSpatialZ] = useState([-1]);
  const [grainSize, setGrainSize] = useState([100]);
  const [grainDensity, setGrainDensity] = useState([10]);
  const [pitchShift, setPitchShift] = useState([0]);
  const [timeStretch, setTimeStretch] = useState([1]);
  const [sidechainThreshold, setSidechainThreshold] = useState([-24]);
  const [sidechainRatio, setSidechainRatio] = useState([4]);
  const [isProcessing, setIsProcessing] = useState(false);

  const applySpatialEffect = async () => {
    if (!audioBlob) {
      toast.error('No audio to process');
      return;
    }

    setIsProcessing(true);
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Create offline context for processing
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;

      // Create 3D panner
      const panner = offlineContext.createPanner();
      // Binaural HRTF for realistic 3D audio
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 1;
      panner.coneInnerAngle = 360;
      panner.coneOuterAngle = 0;
      panner.coneOuterGain = 0;
      
      // Set binaural position
      panner.positionX.value = spatialX[0];
      panner.positionY.value = spatialY[0];
      panner.positionZ.value = spatialZ[0];
      
      // Listener orientation for binaural effect
      offlineContext.listener.forwardX.value = 0;
      offlineContext.listener.forwardY.value = 0;
      offlineContext.listener.forwardZ.value = -1;
      offlineContext.listener.upX.value = 0;
      offlineContext.listener.upY.value = 1;
      offlineContext.listener.upZ.value = 0;

      source.connect(panner);
      panner.connect(offlineContext.destination);
      source.start();

      const renderedBuffer = await offlineContext.startRendering();
      const blob = await bufferToWav(renderedBuffer);
      
      onEffectApplied(blob, `Binaural 3D (${spatialX[0]}, ${spatialY[0]}, ${spatialZ[0]})`);
      toast.success('Spatialisation binaurale appliquée!');
    } catch (error) {
      console.error('Spatial effect error:', error);
      toast.error('Failed to apply spatial effect');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyGranularSynthesis = async () => {
    if (!audioBlob) {
      toast.error('No audio to process');
      return;
    }

    setIsProcessing(true);
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length * 2,
        audioBuffer.sampleRate
      );

      const grainSizeMs = grainSize[0];
      const grainsPerSecond = grainDensity[0];
      const grainSizeSamples = (grainSizeMs / 1000) * audioBuffer.sampleRate;
      const grainInterval = 1 / grainsPerSecond;

      let time = 0;
      while (time < audioBuffer.duration) {
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        
        const gainNode = offlineContext.createGain();
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.5, time + grainSizeMs / 2000);
        gainNode.gain.linearRampToValueAtTime(0, time + grainSizeMs / 1000);

        source.connect(gainNode);
        gainNode.connect(offlineContext.destination);

        const randomOffset = Math.random() * (audioBuffer.duration - grainSizeMs / 1000);
        source.start(time, randomOffset, grainSizeMs / 1000);
        
        time += grainInterval;
      }

      const renderedBuffer = await offlineContext.startRendering();
      const blob = await bufferToWav(renderedBuffer);
      
      onEffectApplied(blob, `Granular (size: ${grainSizeMs}ms, density: ${grainsPerSecond}/s)`);
      toast.success('Granular synthesis applied!');
    } catch (error) {
      console.error('Granular synthesis error:', error);
      toast.error('Failed to apply granular synthesis');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyPitchShift = async () => {
    if (!audioBlob) {
      toast.error('No audio to process');
      return;
    }

    setIsProcessing(true);
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const semitones = pitchShift[0];
      const playbackRate = Math.pow(2, semitones / 12);
      const newLength = Math.floor(audioBuffer.length / playbackRate);

      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        newLength,
        audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;

      source.connect(offlineContext.destination);
      source.start();

      const renderedBuffer = await offlineContext.startRendering();
      const blob = await bufferToWav(renderedBuffer);
      
      onEffectApplied(blob, `Pitch Shift ${semitones > 0 ? '+' : ''}${semitones} semitones`);
      toast.success('Pitch shift applied!');
    } catch (error) {
      console.error('Pitch shift error:', error);
      toast.error('Failed to apply pitch shift');
    } finally {
      setIsProcessing(false);
    }
  };

  const applySidechain = async () => {
    if (!audioBlob) {
      toast.error('No audio to process');
      return;
    }

    setIsProcessing(true);
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;

      const compressor = offlineContext.createDynamicsCompressor();
      compressor.threshold.value = sidechainThreshold[0];
      compressor.knee.value = 30;
      compressor.ratio.value = sidechainRatio[0];
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      source.connect(compressor);
      compressor.connect(offlineContext.destination);
      source.start();

      const renderedBuffer = await offlineContext.startRendering();
      const blob = await bufferToWav(renderedBuffer);
      
      onEffectApplied(blob, `Sidechain (${sidechainThreshold[0]}dB, ${sidechainRatio[0]}:1)`);
      toast.success('Sidechain compression applied!');
    } catch (error) {
      console.error('Sidechain error:', error);
      toast.error('Failed to apply sidechain');
    } finally {
      setIsProcessing(false);
    }
  };

  const bufferToWav = async (buffer: AudioBuffer): Promise<Blob> => {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  return (
    <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur-sm border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-base sm:text-lg">Advanced Audio Effects</h3>
      </div>

      <Tabs defaultValue="spatial" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto gap-1">
          <TabsTrigger value="spatial" className="flex-col gap-1 py-2 px-1 text-xs sm:flex-row sm:gap-2 sm:text-sm sm:px-3">
            <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Binaural</span>
          </TabsTrigger>
          <TabsTrigger value="granular" className="flex-col gap-1 py-2 px-1 text-xs sm:flex-row sm:gap-2 sm:text-sm sm:px-3">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Granular</span>
          </TabsTrigger>
          <TabsTrigger value="pitch" className="flex-col gap-1 py-2 px-1 text-xs sm:flex-row sm:gap-2 sm:text-sm sm:px-3">
            <Waves className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Pitch</span>
          </TabsTrigger>
          <TabsTrigger value="sidechain" className="flex-col gap-1 py-2 px-1 text-xs sm:flex-row sm:gap-2 sm:text-sm sm:px-3">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Sidechain</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="spatial" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Position X</Label>
              <span className="text-sm font-medium text-primary">{spatialX[0].toFixed(1)}</span>
            </div>
            <Slider id="spatial-x-slider" name="spatial-x" value={spatialX} onValueChange={setSpatialX} min={-10} max={10} step={0.1} className="touch-none" aria-label="Position X" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Position Y</Label>
              <span className="text-sm font-medium text-primary">{spatialY[0].toFixed(1)}</span>
            </div>
            <Slider id="spatial-y-slider" name="spatial-y" value={spatialY} onValueChange={setSpatialY} min={-10} max={10} step={0.1} className="touch-none" aria-label="Position Y" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Position Z</Label>
              <span className="text-sm font-medium text-primary">{spatialZ[0].toFixed(1)}</span>
            </div>
            <Slider id="spatial-z-slider" name="spatial-z" value={spatialZ} onValueChange={setSpatialZ} min={-10} max={10} step={0.1} className="touch-none" aria-label="Position Z" />
          </div>
          <Button onClick={applySpatialEffect} disabled={!audioBlob || isProcessing} className="w-full h-11 touch-none">
            Appliquer Spatialisation Binaurale
          </Button>
        </TabsContent>

        <TabsContent value="granular" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Grain Size</Label>
              <span className="text-sm font-medium text-primary">{grainSize[0]}ms</span>
            </div>
            <Slider id="grain-size-slider" name="grain-size" value={grainSize} onValueChange={setGrainSize} min={10} max={500} step={10} className="touch-none" aria-label="Grain Size" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Grain Density</Label>
              <span className="text-sm font-medium text-primary">{grainDensity[0]}/s</span>
            </div>
            <Slider id="grain-density-slider" name="grain-density" value={grainDensity} onValueChange={setGrainDensity} min={1} max={50} step={1} className="touch-none" aria-label="Grain Density" />
          </div>
          <Button onClick={applyGranularSynthesis} disabled={!audioBlob || isProcessing} className="w-full h-11 touch-none">
            Apply Granular Synthesis
          </Button>
        </TabsContent>

        <TabsContent value="pitch" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Pitch Shift</Label>
              <span className="text-sm font-medium text-primary">{pitchShift[0] > 0 ? '+' : ''}{pitchShift[0]} semitones</span>
            </div>
            <Slider id="pitch-shift-slider" name="pitch-shift" value={pitchShift} onValueChange={setPitchShift} min={-12} max={12} step={1} className="touch-none" aria-label="Pitch Shift" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Time Stretch</Label>
              <span className="text-sm font-medium text-primary">{timeStretch[0].toFixed(2)}x</span>
            </div>
            <Slider id="time-stretch-slider" name="time-stretch" value={timeStretch} onValueChange={setTimeStretch} min={0.5} max={2} step={0.1} className="touch-none" aria-label="Time Stretch" />
          </div>
          <Button onClick={applyPitchShift} disabled={!audioBlob || isProcessing} className="w-full h-11 touch-none">
            Apply Pitch Shift
          </Button>
        </TabsContent>

        <TabsContent value="sidechain" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Threshold</Label>
              <span className="text-sm font-medium text-primary">{sidechainThreshold[0]}dB</span>
            </div>
            <Slider id="sidechain-threshold-slider" name="sidechain-threshold" value={sidechainThreshold} onValueChange={setSidechainThreshold} min={-60} max={0} step={1} className="touch-none" aria-label="Sidechain Threshold" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Ratio</Label>
              <span className="text-sm font-medium text-primary">{sidechainRatio[0]}:1</span>
            </div>
            <Slider id="sidechain-ratio-slider" name="sidechain-ratio" value={sidechainRatio} onValueChange={setSidechainRatio} min={1} max={20} step={1} className="touch-none" aria-label="Sidechain Ratio" />
          </div>
          <Button onClick={applySidechain} disabled={!audioBlob || isProcessing} className="w-full h-11 touch-none">
            Apply Sidechain
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
