import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Waves, Volume2, Filter, Clock } from 'lucide-react';

interface AdvancedEffectsProps {
  audioBlob: Blob;
  onApplyEffect: (effectBlob: Blob, effectName: string) => void;
}

export const AdvancedEffects = ({ audioBlob, onApplyEffect }: AdvancedEffectsProps) => {
  const [eqBands, setEqBands] = useState({
    low: 0,
    mid: 0,
    high: 0,
  });
  const [compression, setCompression] = useState({
    threshold: -24,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
  });
  const [filter, setFilter] = useState({
    type: 'lowpass' as BiquadFilterType,
    frequency: 1000,
    q: 1,
  });
  const [delay, setDelay] = useState({
    time: 0.3,
    feedback: 0.3,
    mix: 0.5,
  });

  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new AudioContext();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const applyEQ = async () => {
    if (!audioContextRef.current) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;

      // Create three-band EQ
      const lowBand = offlineContext.createBiquadFilter();
      lowBand.type = 'lowshelf';
      lowBand.frequency.value = 320;
      lowBand.gain.value = eqBands.low;

      const midBand = offlineContext.createBiquadFilter();
      midBand.type = 'peaking';
      midBand.frequency.value = 1000;
      midBand.Q.value = 0.5;
      midBand.gain.value = eqBands.mid;

      const highBand = offlineContext.createBiquadFilter();
      highBand.type = 'highshelf';
      highBand.frequency.value = 3200;
      highBand.gain.value = eqBands.high;

      source.connect(lowBand);
      lowBand.connect(midBand);
      midBand.connect(highBand);
      highBand.connect(offlineContext.destination);

      source.start(0);
      const renderedBuffer = await offlineContext.startRendering();

      const wavBlob = await bufferToWave(renderedBuffer);
      onApplyEffect(wavBlob, `EQ (L:${eqBands.low}dB M:${eqBands.mid}dB H:${eqBands.high}dB)`);
    } catch (error) {
      console.error('Error applying EQ:', error);
      toast.error('Erreur lors de l\'application de l\'EQ');
    }
  };

  const applyCompression = async () => {
    if (!audioContextRef.current) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;

      const compressor = offlineContext.createDynamicsCompressor();
      compressor.threshold.value = compression.threshold;
      compressor.ratio.value = compression.ratio;
      compressor.attack.value = compression.attack;
      compressor.release.value = compression.release;

      source.connect(compressor);
      compressor.connect(offlineContext.destination);

      source.start(0);
      const renderedBuffer = await offlineContext.startRendering();

      const wavBlob = await bufferToWave(renderedBuffer);
      onApplyEffect(wavBlob, `Compressor (${compression.ratio}:1)`);
    } catch (error) {
      console.error('Error applying compression:', error);
      toast.error('Erreur lors de l\'application de la compression');
    }
  };

  const applyFilter = async () => {
    if (!audioContextRef.current) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;

      const biquadFilter = offlineContext.createBiquadFilter();
      biquadFilter.type = filter.type;
      biquadFilter.frequency.value = filter.frequency;
      biquadFilter.Q.value = filter.q;

      source.connect(biquadFilter);
      biquadFilter.connect(offlineContext.destination);

      source.start(0);
      const renderedBuffer = await offlineContext.startRendering();

      const wavBlob = await bufferToWave(renderedBuffer);
      onApplyEffect(wavBlob, `Filter (${filter.type} ${filter.frequency}Hz)`);
    } catch (error) {
      console.error('Error applying filter:', error);
      toast.error('Erreur lors de l\'application du filtre');
    }
  };

  const applyDelay = async () => {
    if (!audioContextRef.current) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;

      const delayNode = offlineContext.createDelay(5);
      delayNode.delayTime.value = delay.time;

      const feedbackGain = offlineContext.createGain();
      feedbackGain.gain.value = delay.feedback;

      const mixGain = offlineContext.createGain();
      mixGain.gain.value = delay.mix;

      const dryGain = offlineContext.createGain();
      dryGain.gain.value = 1 - delay.mix;

      // Dry signal
      source.connect(dryGain);
      dryGain.connect(offlineContext.destination);

      // Wet signal
      source.connect(delayNode);
      delayNode.connect(feedbackGain);
      feedbackGain.connect(delayNode);
      delayNode.connect(mixGain);
      mixGain.connect(offlineContext.destination);

      source.start(0);
      const renderedBuffer = await offlineContext.startRendering();

      const wavBlob = await bufferToWave(renderedBuffer);
      onApplyEffect(wavBlob, `Delay (${delay.time}s)`);
    } catch (error) {
      console.error('Error applying delay:', error);
      toast.error('Erreur lors de l\'application du delay');
    }
  };

  const bufferToWave = (buffer: AudioBuffer): Promise<Blob> => {
    return new Promise((resolve) => {
      const numberOfChannels = buffer.numberOfChannels;
      const length = buffer.length * numberOfChannels * 2 + 44;
      const arrayBuffer = new ArrayBuffer(length);
      const view = new DataView(arrayBuffer);
      const channels: Float32Array[] = [];
      let offset = 0;
      let pos = 0;

      // Write WAV header
      const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
      };
      const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
      };

      setUint32(0x46464952); // "RIFF"
      setUint32(length - 8); // file length - 8
      setUint32(0x45564157); // "WAVE"
      setUint32(0x20746d66); // "fmt " chunk
      setUint32(16); // length = 16
      setUint16(1); // PCM (uncompressed)
      setUint16(numberOfChannels);
      setUint32(buffer.sampleRate);
      setUint32(buffer.sampleRate * 2 * numberOfChannels); // avg. bytes/sec
      setUint16(numberOfChannels * 2); // block-align
      setUint16(16); // 16-bit
      setUint32(0x61746164); // "data" - chunk
      setUint32(length - pos - 4); // chunk length

      // Write interleaved data
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
      }

      while (pos < length) {
        for (let i = 0; i < numberOfChannels; i++) {
          let sample = Math.max(-1, Math.min(1, channels[i][offset]));
          sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          view.setInt16(pos, sample, true);
          pos += 2;
        }
        offset++;
      }

      resolve(new Blob([arrayBuffer], { type: 'audio/wav' }));
    });
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Effets Avancés</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <Tabs defaultValue="eq" className="w-full">
          <TabsList className="grid grid-cols-4 w-full h-auto gap-1">
            <TabsTrigger value="eq" className="flex-col gap-1 py-2 px-1 text-xs sm:flex-row sm:gap-2 sm:text-sm sm:px-3">
              <Waves className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">EQ</span>
            </TabsTrigger>
            <TabsTrigger value="compressor" className="flex-col gap-1 py-2 px-1 text-xs sm:flex-row sm:gap-2 sm:text-sm sm:px-3">
              <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Comp</span>
            </TabsTrigger>
            <TabsTrigger value="filter" className="flex-col gap-1 py-2 px-1 text-xs sm:flex-row sm:gap-2 sm:text-sm sm:px-3">
              <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Filter</span>
            </TabsTrigger>
            <TabsTrigger value="delay" className="flex-col gap-1 py-2 px-1 text-xs sm:flex-row sm:gap-2 sm:text-sm sm:px-3">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Delay</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="eq" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Low</Label>
                  <span className="text-sm font-medium text-primary">{eqBands.low}dB</span>
                </div>
                <Slider
                  id="eq-low-slider"
                  name="eq-low"
                  value={[eqBands.low]}
                  onValueChange={([value]) => setEqBands({ ...eqBands, low: value })}
                  min={-12}
                  max={12}
                  step={1}
                  className="touch-none"
                  aria-label="EQ Low"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Mid</Label>
                  <span className="text-sm font-medium text-primary">{eqBands.mid}dB</span>
                </div>
                <Slider
                  id="eq-mid-slider"
                  name="eq-mid"
                  value={[eqBands.mid]}
                  onValueChange={([value]) => setEqBands({ ...eqBands, mid: value })}
                  min={-12}
                  max={12}
                  step={1}
                  className="touch-none"
                  aria-label="EQ Mid"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">High</Label>
                  <span className="text-sm font-medium text-primary">{eqBands.high}dB</span>
                </div>
                <Slider
                  id="eq-high-slider"
                  name="eq-high"
                  value={[eqBands.high]}
                  onValueChange={([value]) => setEqBands({ ...eqBands, high: value })}
                  min={-12}
                  max={12}
                  step={1}
                  className="touch-none"
                  aria-label="EQ High"
                />
              </div>
            </div>
            <Button onClick={applyEQ} className="w-full h-11 touch-none">
              Appliquer EQ
            </Button>
          </TabsContent>

          <TabsContent value="compressor" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Threshold</Label>
                  <span className="text-sm font-medium text-primary">{compression.threshold}dB</span>
                </div>
                <Slider
                  id="compression-threshold-slider"
                  name="compression-threshold"
                  value={[compression.threshold]}
                  onValueChange={([value]) => setCompression({ ...compression, threshold: value })}
                  min={-60}
                  max={0}
                  step={1}
                  className="touch-none"
                  aria-label="Compression Threshold"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Ratio</Label>
                  <span className="text-sm font-medium text-primary">{compression.ratio}:1</span>
                </div>
                <Slider
                  id="compression-ratio-slider"
                  name="compression-ratio"
                  value={[compression.ratio]}
                  onValueChange={([value]) => setCompression({ ...compression, ratio: value })}
                  min={1}
                  max={20}
                  step={1}
                  className="touch-none"
                  aria-label="Compression Ratio"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Attack</Label>
                  <span className="text-sm font-medium text-primary">{(compression.attack * 1000).toFixed(1)}ms</span>
                </div>
                <Slider
                  id="compression-attack-slider"
                  name="compression-attack"
                  value={[compression.attack]}
                  onValueChange={([value]) => setCompression({ ...compression, attack: value })}
                  min={0}
                  max={1}
                  step={0.001}
                  className="touch-none"
                  aria-label="Compression Attack"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Release</Label>
                  <span className="text-sm font-medium text-primary">{(compression.release * 1000).toFixed(0)}ms</span>
                </div>
                <Slider
                  id="compression-release-slider"
                  name="compression-release"
                  value={[compression.release]}
                  onValueChange={([value]) => setCompression({ ...compression, release: value })}
                  min={0}
                  max={1}
                  step={0.01}
                  className="touch-none"
                  aria-label="Compression Release"
                />
              </div>
            </div>
            <Button onClick={applyCompression} className="w-full h-11 touch-none">
              Appliquer Compressor
            </Button>
          </TabsContent>

          <TabsContent value="filter" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Type</Label>
                <select
                  id="filter-type-select"
                  name="filter-type"
                  value={filter.type}
                  onChange={(e) => setFilter({ ...filter, type: e.target.value as BiquadFilterType })}
                  className="w-full h-11 p-2 rounded-md bg-background text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Filter Type"
                >
                  <option value="lowpass">Lowpass</option>
                  <option value="highpass">Highpass</option>
                  <option value="bandpass">Bandpass</option>
                  <option value="notch">Notch</option>
                  <option value="allpass">Allpass</option>
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Frequency</Label>
                  <span className="text-sm font-medium text-primary">{filter.frequency}Hz</span>
                </div>
                <Slider
                  id="filter-frequency-slider"
                  name="filter-frequency"
                  value={[filter.frequency]}
                  onValueChange={([value]) => setFilter({ ...filter, frequency: value })}
                  min={20}
                  max={20000}
                  step={10}
                  className="touch-none"
                  aria-label="Filter Frequency"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Q</Label>
                  <span className="text-sm font-medium text-primary">{filter.q.toFixed(2)}</span>
                </div>
                <Slider
                  id="filter-q-slider"
                  name="filter-q"
                  value={[filter.q]}
                  onValueChange={([value]) => setFilter({ ...filter, q: value })}
                  min={0.01}
                  max={30}
                  step={0.1}
                  className="touch-none"
                  aria-label="Filter Q"
                />
              </div>
            </div>
            <Button onClick={applyFilter} className="w-full h-11 touch-none">
              Appliquer Filter
            </Button>
          </TabsContent>

          <TabsContent value="delay" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Time</Label>
                  <span className="text-sm font-medium text-primary">{delay.time.toFixed(2)}s</span>
                </div>
                <Slider
                  id="delay-time-slider"
                  name="delay-time"
                  value={[delay.time]}
                  onValueChange={([value]) => setDelay({ ...delay, time: value })}
                  min={0.01}
                  max={2}
                  step={0.01}
                  className="touch-none"
                  aria-label="Delay Time"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Feedback</Label>
                  <span className="text-sm font-medium text-primary">{(delay.feedback * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  id="delay-feedback-slider"
                  name="delay-feedback"
                  value={[delay.feedback]}
                  onValueChange={([value]) => setDelay({ ...delay, feedback: value })}
                  min={0}
                  max={0.9}
                  step={0.01}
                  className="touch-none"
                  aria-label="Delay Feedback"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Mix</Label>
                  <span className="text-sm font-medium text-primary">{(delay.mix * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  id="delay-mix-slider"
                  name="delay-mix"
                  value={[delay.mix]}
                  onValueChange={([value]) => setDelay({ ...delay, mix: value })}
                  min={0}
                  max={1}
                  step={0.01}
                  className="touch-none"
                  aria-label="Delay Mix"
                />
              </div>
            </div>
            <Button onClick={applyDelay} className="w-full h-11 touch-none">
              Appliquer Delay
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
