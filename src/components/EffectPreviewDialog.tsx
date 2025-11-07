import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Check, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface EffectPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audioBlob: Blob | null;
  effectName: string;
  onKeep: () => void;
  onDiscard: () => void;
}

export const EffectPreviewDialog = ({
  open,
  onOpenChange,
  audioBlob,
  effectName,
  onKeep,
  onDiscard
}: EffectPreviewDialogProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioBlob && open) {
      const url = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(url);
      
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          URL.revokeObjectURL(url);
        }
      };
    }
  }, [audioBlob, open]);

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleKeep = () => {
    onKeep();
    onOpenChange(false);
  };

  const handleDiscard = () => {
    onDiscard();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Effet Appliqué : {effectName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Écoutez le résultat et choisissez si vous souhaitez le garder ou le supprimer.
          </p>
          
          <Button
            onClick={handlePlay}
            variant="secondary"
            className="w-full"
          >
            <Play className={`h-4 w-4 mr-2 ${isPlaying ? 'animate-pulse' : ''}`} />
            {isPlaying ? 'Écoute en cours...' : 'Écouter le résultat'}
          </Button>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            onClick={handleDiscard}
            variant="outline"
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
          <Button
            onClick={handleKeep}
            variant="default"
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            Garder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
