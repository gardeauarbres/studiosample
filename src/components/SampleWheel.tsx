import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shuffle, Lightbulb } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ComingSoonDialog } from './ComingSoonDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSamples } from '@/hooks/useSamples';
import { supabase } from '@/integrations/supabase/client';

interface SampleWheelProps {
  onRandomEffect: (sampleId: string) => void;
  userLevel: number;
}

export const SampleWheel = ({ onRandomEffect, userLevel }: SampleWheelProps) => {
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const { samples, isLoading } = useSamples(userId);

  const handleApplyEffect = () => {
    if (!selectedSampleId) {
      return;
    }
    onRandomEffect(selectedSampleId);
  };

  return (
    <>
      <Card className="p-6 space-y-4 border-2 border-border bg-card/80 backdrop-blur">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shuffle className="h-5 w-5 text-primary" />
          Créativité
        </h3>
        
        <div className="space-y-3">
          <Select value={selectedSampleId} onValueChange={setSelectedSampleId}>
            <SelectTrigger id="sample-wheel-select" className="w-full" aria-label="Choisir un sample">
              <SelectValue placeholder="Choisir un sample" />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <SelectItem value="loading" disabled>Chargement...</SelectItem>
              ) : samples && samples.length > 0 ? (
                samples.map((sample) => (
                  <SelectItem key={sample.id} value={sample.id}>
                    {sample.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-samples" disabled>Aucun sample disponible</SelectItem>
              )}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleApplyEffect}
                    variant="secondary"
                    className="w-full hover-scale"
                    disabled={!selectedSampleId || selectedSampleId === 'loading' || selectedSampleId === 'no-samples'}
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    Effet Surprise
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sélectionnez un sample et appliquez un effet aléatoire</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              onClick={() => setComingSoonOpen(true)}
              variant="secondary"
              className="w-full hover-scale"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Inspiration
            </Button>
          </div>
        </div>
      </Card>

      <ComingSoonDialog 
        open={comingSoonOpen} 
        onOpenChange={setComingSoonOpen}
        featureName="Inspiration Créative IA"
      />
    </>
  );
};
