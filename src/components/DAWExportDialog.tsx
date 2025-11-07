import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileMusic, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DAWExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audioBlob: Blob;
  sampleName: string;
}

export const DAWExportDialog = ({ open, onOpenChange, audioBlob, sampleName }: DAWExportDialogProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [tempo, setTempo] = useState('120');
  const [key, setKey] = useState('C');
  const [exportFormat, setExportFormat] = useState<'midi' | 'metadata'>('midi');

  const handleExportMIDI = async () => {
    setIsProcessing(true);
    try {
      // Dynamic import of midiExporter for code splitting
      const { midiExporter } = await import('@/utils/midiExporter');
      
      // Detect pitch and convert to MIDI
      const notes = await midiExporter.detectPitchFromAudio(audioBlob);
      
      if (notes.length === 0) {
        toast.error('Aucune note détectée', {
          description: 'Le sample ne contient pas de hauteurs musicales claires',
        });
        setIsProcessing(false);
        return;
      }

      await midiExporter.exportToMIDI(
        notes,
        {
          tempo: parseInt(tempo),
          timeSignature: [4, 4],
          trackName: sampleName,
        },
        sampleName
      );

      toast.success('Export MIDI réussi !', {
        description: `Le fichier ${sampleName}.mid a été téléchargé`
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error exporting MIDI:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      toast.error('Erreur lors de l\'export MIDI', {
        description: errorMessage.includes('detect') 
          ? 'Impossible de détecter les notes dans ce sample' 
          : `Erreur technique : ${errorMessage}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportMetadata = () => {
    const metadata = {
      name: sampleName,
      tempo: parseInt(tempo),
      key: key,
      type: 'audio_sample',
      created: new Date().toISOString(),
      tags: ['sample', 'studio_samples'],
    };

    const json = JSON.stringify(metadata, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sampleName}_metadata.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Métadonnées exportées !');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileMusic className="h-5 w-5 text-primary" />
            Export pour DAW
          </DialogTitle>
          <DialogDescription>
            Exportez votre sample au format MIDI ou avec métadonnées pour votre DAW
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="export-format-select">Format d'export</Label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'midi' | 'metadata')}>
              <SelectTrigger id="export-format-select" aria-label="Format d'export">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="midi">MIDI (avec détection de hauteur)</SelectItem>
                <SelectItem value="metadata">Métadonnées JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tempo">Tempo (BPM)</Label>
            <Input
              id="tempo"
              name="tempo"
              type="number"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              min="60"
              max="200"
              aria-label="Tempo (BPM)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key-select">Tonalité</Label>
            <Select value={key} onValueChange={setKey}>
              <SelectTrigger id="key-select" aria-label="Tonalité">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="C#">C#</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="D#">D#</SelectItem>
                <SelectItem value="E">E</SelectItem>
                <SelectItem value="F">F</SelectItem>
                <SelectItem value="F#">F#</SelectItem>
                <SelectItem value="G">G</SelectItem>
                <SelectItem value="G#">G#</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="A#">A#</SelectItem>
                <SelectItem value="B">B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={exportFormat === 'midi' ? handleExportMIDI : handleExportMetadata}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                `Exporter ${exportFormat === 'midi' ? 'MIDI' : 'Métadonnées'}`
              )}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="secondary"
              disabled={isProcessing}
            >
              Annuler
            </Button>
          </div>

          {exportFormat === 'midi' && (
            <p className="text-xs text-muted-foreground">
              Note : La détection de hauteur fonctionne mieux avec des samples mélodiques clairs (piano, voix, etc.)
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
