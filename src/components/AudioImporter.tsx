import { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileAudio } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AudioImporterProps {
  onImport: (file: File) => void;
}

export const AudioImporter = ({ onImport }: AudioImporterProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => 
      file.type.startsWith('audio/') || 
      file.name.endsWith('.wav') || 
      file.name.endsWith('.mp3') || 
      file.name.endsWith('.m4a') ||
      file.name.endsWith('.webm')
    );

    if (audioFiles.length === 0) {
      toast.error('Aucun fichier audio détecté');
      return;
    }

    audioFiles.forEach(file => {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error(`${file.name} est trop volumineux (max 50MB)`);
        return;
      }
      onImport(file);
      toast.success(`${file.name} importé !`);
    });
  }, [onImport]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} est trop volumineux (max 50MB)`);
        return;
      }
      onImport(file);
      toast.success(`${file.name} importé !`);
    });
    e.target.value = '';
  }, [onImport]);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="w-5 h-5" />
          Importer des fichiers audio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-all",
            isDragging 
              ? "border-primary bg-primary/10" 
              : "border-border hover:border-primary/50"
          )}
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <Upload className={cn(
                "w-12 h-12 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">
                Glissez vos fichiers audio ici
              </p>
              <p className="text-sm text-muted-foreground">
                WAV, MP3, M4A, WebM • Max 50MB
              </p>
            </div>

            <div className="relative">
              <input
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.webm"
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="audio-file-input"
                name="audio-file-input"
              />
              <Button variant="secondary" asChild>
                <label htmlFor="audio-file-input" className="cursor-pointer">
                  Parcourir les fichiers
                </label>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
