import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ComingSoonDialog } from "./ComingSoonDialog";

interface AIAnalysisDialogProps {
  sampleName: string;
  duration: number;
  onNameSelected?: (name: string) => void;
}

export const AIAnalysisDialog = ({ sampleName, duration, onNameSelected }: AIAnalysisDialogProps) => {
  const [open, setOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Audio Assistant
            </DialogTitle>
            <DialogDescription>
              Analyse et suggestions créatives pour vos samples
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setComingSoonOpen(true)}
                className="gap-2"
                variant="secondary"
              >
                Analyser le Sample
              </Button>
              <Button
                onClick={() => setComingSoonOpen(true)}
                className="gap-2"
                variant="secondary"
              >
                Suggérer Effets
              </Button>
              <Button
                onClick={() => setComingSoonOpen(true)}
                className="gap-2 col-span-2"
                variant="secondary"
              >
                Générer Noms Créatifs
              </Button>
            </div>

            <div className="text-xs text-muted-foreground border-t pt-3">
              <div>Sample: <span className="font-mono">{sampleName}</span></div>
              <div>Durée: <span className="font-mono">{duration.toFixed(2)}s</span></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ComingSoonDialog 
        open={comingSoonOpen} 
        onOpenChange={setComingSoonOpen}
        featureName="Assistant IA pour Audio"
      />
    </>
  );
};
