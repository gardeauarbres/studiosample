import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface ComingSoonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

export const ComingSoonDialog = ({ 
  open, 
  onOpenChange, 
  featureName = "Analyse Audio Avancée IA" 
}: ComingSoonDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">{featureName}</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-4">
            <div className="space-y-4">
              <p>
                Cette fonctionnalité est en cours de développement et sera prochainement accessible 
                dans le cadre de notre plan d'abonnement.
              </p>
              <p className="text-primary font-medium">
                Restez connecté pour profiter d'analyses encore plus puissantes bientôt !
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Retour
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
