import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Square, Trash2, Plus } from 'lucide-react';
import { useSequencer } from '@/hooks/useSequencer';
import { useSamples, SampleWithBlob } from '@/hooks/useSamples';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { SequencerDropZone } from './SequencerDropZone';

export const Sequencer = () => {
  const [userId, setUserId] = useState<string | undefined>();
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const { samples, isLoading } = useSamples(userId);
  const {
    tracks,
    currentStep,
    isPlaying,
    bpm,
    quantize,
    addTrack,
    removeTrack,
    toggleStep,
    updateTrackSample,
    start,
    stop,
    pause,
    clear,
    setBpm,
    setQuantize,
  } = useSequencer(16, 120);

  const handleAddTrack = async (sample: SampleWithBlob) => {
    if (tracks.length >= 8) {
      toast.error('Maximum 8 pistes atteint');
      return;
    }
    
    if (!sample.blob) {
      toast.error('Sample non disponible');
      return;
    }
    
    addTrack(sample.name, sample.blob, sample.id);
    toast.success(`Piste ajoutée: ${sample.name}`);
  };


  const handleRemoveTrack = (trackId: string) => {
    removeTrack(trackId);
    toast.success('Piste supprimée');
  };

  const handleChangeSample = async (trackId: string, sampleId: string) => {
    const sample = samples?.find(s => s.id === sampleId);
    if (!sample?.blob) {
      toast.error('Sample non disponible');
      return;
    }
    updateTrackSample(trackId, sample.name, sample.blob, sample.id);
    toast.success(`Sample changé: ${sample.name}`);
  };

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            Chargement des samples...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Séquenceur 16 Steps</span>
          <div className="flex gap-2">
            {!isPlaying ? (
              <Button
                onClick={start}
                size="sm"
                variant="default"
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Play
              </Button>
            ) : (
              <Button
                onClick={pause}
                size="sm"
                variant="secondary"
                className="gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            )}
            <Button
              onClick={stop}
              size="sm"
              variant="destructive"
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              Stop
            </Button>
            <Button
              onClick={clear}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex items-center gap-8">
          <div className="flex-1 space-y-2">
            <Label>BPM: {bpm}</Label>
            <Slider
              value={[bpm]}
              onValueChange={([value]) => setBpm(value)}
              min={60}
              max={200}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={quantize}
              onCheckedChange={setQuantize}
              id="quantize"
            />
            <Label htmlFor="quantize">Quantize</Label>
          </div>
        </div>

        {/* Sample Selection */}
        <div className="space-y-2">
          <Label>Ajouter un sample à une piste:</Label>
          {samples && samples.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {samples.slice(0, 8).map(sample => (
                <Button
                  key={sample.id}
                  onClick={() => handleAddTrack(sample)}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={!sample.blob}
                >
                  <Plus className="w-3 h-3" />
                  {sample.name}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun sample disponible</p>
          )}
        </div>

        {/* Tracks and Steps */}
        {tracks.length > 0 && (
          <div className="space-y-3">
            {tracks.map((track) => (
              <div key={track.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Select
                    value={track.sampleId || ''}
                    onValueChange={(sampleId) => handleChangeSample(track.id, sampleId)}
                  >
                    <SelectTrigger id={`sequencer-track-${track.id}-select`} className="w-[200px]" aria-label={`Sélectionner un sample pour la piste ${track.name}`}>
                      <SelectValue>
                        {track.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {samples?.filter(s => s.blob).map((sample) => (
                        <SelectItem key={sample.id} value={sample.id}>
                          {sample.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleRemoveTrack(track.id)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-8 sm:grid-cols-16 gap-1">
                  {track.steps.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => toggleStep(track.id, step.id)}
                      className={cn(
                        "aspect-square rounded transition-all",
                        step.active
                          ? "bg-primary hover:bg-primary/80"
                          : "bg-secondary hover:bg-secondary/80",
                        currentStep === step.id && isPlaying && "ring-2 ring-accent"
                      )}
                      aria-label={`Step ${step.id + 1}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tracks.length === 0 && (
          <SequencerDropZone onDrop={handleAddTrack} samples={samples || []} />
        )}
      </CardContent>
    </Card>
  );
};
