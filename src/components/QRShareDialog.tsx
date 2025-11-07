import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';
import { QrCode, X } from 'lucide-react';
import { toast } from 'sonner';

interface QRShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sampleUrl: string;
  sampleName: string;
}

export const QRShareDialog = ({ open, onOpenChange, sampleUrl, sampleName }: QRShareDialogProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const generateQR = useCallback(async () => {
    try {
      const url = await QRCode.toDataURL(sampleUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#FF5722',
          light: '#1A1A1A',
        },
      });
      setQrDataUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Erreur lors de la génération du QR code');
    }
  }, [sampleUrl]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr-${sampleName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code téléchargé !');
  };

  useEffect(() => {
    if (open && sampleUrl) {
      void generateQR();
    }
  }, [generateQR, open, sampleUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Partager via QR Code
          </DialogTitle>
          <DialogDescription>
            Générez et téléchargez un code QR pour partager ce sample
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="QR Code" 
                className="rounded-lg border-2 border-border bg-card p-4"
              />
            ) : (
              <div className="w-[300px] h-[300px] flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                <span className="text-muted-foreground">Génération...</span>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground text-center">
              Scannez ce code pour accéder au sample
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={downloadQR} 
              disabled={!qrDataUrl}
              className="flex-1"
            >
              Télécharger QR
            </Button>
            <Button 
              onClick={() => onOpenChange(false)} 
              variant="secondary"
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
