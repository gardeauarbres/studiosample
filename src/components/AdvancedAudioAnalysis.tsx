import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { Activity } from 'lucide-react';
import { ComingSoonDialog } from './ComingSoonDialog';

interface AdvancedAudioAnalysisProps {
  audioBlob: Blob;
  sampleName: string;
  duration: number;
}

export const AdvancedAudioAnalysis = ({ 
  audioBlob, 
  sampleName, 
  duration 
}: AdvancedAudioAnalysisProps) => {
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Analyse Audio Avancée IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={() => setComingSoonOpen(true)}
              disabled={!audioBlob}
              className="flex-1"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Analyser le sample
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>• Analyse propulsée par IA (Gemini 2.5)</p>
            <p>• Détection automatique de BPM, tonalité et genre</p>
            <p>• Suggestions créatives personnalisées</p>
          </div>
        </CardContent>
      </Card>

      <ComingSoonDialog 
        open={comingSoonOpen} 
        onOpenChange={setComingSoonOpen}
        featureName="Analyse Audio Avancée IA"
      />
    </>
  );
};
