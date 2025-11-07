import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Play } from 'lucide-react';
import { toast } from 'sonner';

interface AudioMorphingProps {
  samples: Array<{ id: string; name: string; blob: Blob }>;
  onMorphed: (blob: Blob, name: string) => void;
}

export const AudioMorphing = ({ samples, onMorphed }: AudioMorphingProps) => {
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [morphAmount, setMorphAmount] = useState([50]);
  const [isProcessing, setIsProcessing] = useState(false);

  const applyMorphing = async () => {
    if (!sourceId || !targetId) {
      toast.error('Sélectionnez deux samples');
      return;
    }

    if (sourceId === targetId) {
      toast.error('Sélectionnez deux samples différents');
      return;
    }

    setIsProcessing(true);
    try {
      const sourceBlob = samples.find(s => s.id === sourceId)?.blob;
      const targetBlob = samples.find(s => s.id === targetId)?.blob;

      if (!sourceBlob || !targetBlob) {
        throw new Error('Samples introuvables');
      }

      const audioContext = new AudioContext();
      
      // Decode both audio files
      const [sourceBuffer, targetBuffer] = await Promise.all([
        audioContext.decodeAudioData(await sourceBlob.arrayBuffer()),
        audioContext.decodeAudioData(await targetBlob.arrayBuffer())
      ]);

      // Create offline context
      const maxLength = Math.max(sourceBuffer.length, targetBuffer.length);
      const offlineContext = new OfflineAudioContext(
        2,
        maxLength,
        audioContext.sampleRate
      );

      // Create sources
      const source1 = offlineContext.createBufferSource();
      const source2 = offlineContext.createBufferSource();
      source1.buffer = sourceBuffer;
      source2.buffer = targetBuffer;

      // Create gain nodes for crossfading
      const gain1 = offlineContext.createGain();
      const gain2 = offlineContext.createGain();
      
      const morphValue = morphAmount[0] / 100;
      gain1.gain.value = 1 - morphValue;
      gain2.gain.value = morphValue;

      // Connect the audio graph
      source1.connect(gain1);
      source2.connect(gain2);
      gain1.connect(offlineContext.destination);
      gain2.connect(offlineContext.destination);

      // Start both sources
      source1.start();
      source2.start();

      // Render the audio
      const renderedBuffer = await offlineContext.startRendering();
      const blob = await bufferToWav(renderedBuffer);

      const sourceName = samples.find(s => s.id === sourceId)?.name || 'Sample 1';
      const targetName = samples.find(s => s.id === targetId)?.name || 'Sample 2';
      
      onMorphed(blob, `Morph ${sourceName} → ${targetName} (${morphAmount[0]}%)`);
      toast.success('Morphing appliqué avec succès!');
    } catch (error) {
      console.error('Morphing error:', error);
      toast.error('Erreur lors du morphing');
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
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Morphing Temps Réel</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="morph-source-select">Sample Source</Label>
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger id="morph-source-select" aria-label="Sample Source">
              <SelectValue placeholder="Sélectionner source..." />
            </SelectTrigger>
            <SelectContent>
              {samples.map(sample => (
                <SelectItem key={sample.id} value={sample.id}>
                  {sample.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="morph-target-select">Sample Cible</Label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger id="morph-target-select" aria-label="Sample Cible">
              <SelectValue placeholder="Sélectionner cible..." />
            </SelectTrigger>
            <SelectContent>
              {samples.map(sample => (
                <SelectItem key={sample.id} value={sample.id}>
                  {sample.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Morphing: {morphAmount[0]}%</Label>
          <Slider 
            id="morph-amount-slider"
            name="morph-amount"
            value={morphAmount} 
            onValueChange={setMorphAmount} 
            min={0} 
            max={100} 
            step={1}
            disabled={isProcessing}
            aria-label="Morphing"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Source 100%</span>
            <span>Cible 100%</span>
          </div>
        </div>

        <Button 
          onClick={applyMorphing} 
          disabled={!sourceId || !targetId || isProcessing} 
          className="w-full"
        >
          <Play className="w-4 h-4 mr-2" />
          {isProcessing ? 'Traitement...' : 'Appliquer Morphing'}
        </Button>
      </div>
    </Card>
  );
};
