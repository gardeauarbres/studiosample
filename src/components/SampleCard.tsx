import { useState, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Star, Play, Share2, Trash2, Edit2, Check, GripVertical, QrCode, FileMusic, RotateCw, Wand2
} from 'lucide-react';
import { ExportOptions } from './ExportOptions';
import { DAWExportDialog } from './DAWExportDialog';
import { LoopPlayer } from './LoopPlayer';
import { AIAnalysisDialog } from './AIAnalysisDialog';

interface AudioSample {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  timestamp: number;
  effects?: string[];
  isFavorite: boolean; // Rendre obligatoire pour cohérence avec AudioRecorder
}

interface SampleCardProps {
  sample: AudioSample;
  index: number;
  playingId: string | null;
  editingId: string | null;
  editName: string;
  onPlay: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  onShareQR: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onSaveEdit: (id: string, newName: string) => void;
  onEditNameChange: (name: string) => void;
  onOpenEffects?: () => void;
  formatTime: (seconds: number) => string;
}

const SampleCardComponent = ({
  sample,
  index,
  playingId,
  editingId,
  editName,
  onPlay,
  onToggleFavorite,
  onShare,
  onShareQR,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onEditNameChange,
  onOpenEffects,
  formatTime,
}: SampleCardProps) => {
  const [dawExportOpen, setDawExportOpen] = useState(false);
  const [loopMode, setLoopMode] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sample.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDragStart = (e: React.DragEvent) => {
    // Prevent drag if starting from the grip handle (dnd-kit handles that)
    const target = e.target as HTMLElement;
    if (target.closest('[data-grip-handle]') || target.hasAttribute('data-grip-handle')) {
      e.preventDefault();
      return;
    }
    
    // Native HTML5 drag for sequencer drop
    e.dataTransfer.setData('sample-id', sample.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sample.name);
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    // Clear any drag data
    if (e.dataTransfer) {
      e.dataTransfer.clearData();
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-6 border-2 border-border hover:border-primary/50 transition-all bg-card/80 backdrop-blur animate-fade-in hover-scale"
      data-index={index}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <button
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
            {...attributes}
            {...listeners}
            data-grip-handle
            draggable={false}
            aria-label={`Déplacer ${sample.name}`}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <div className="flex-1 space-y-1">
            {editingId === sample.id ? (
              <div className="flex gap-2">
                <Input
                  value={editName}
                  onChange={(e) => onEditNameChange(e.target.value)}
                  className="font-semibold"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => onSaveEdit(sample.id, editName)}
                  variant="secondary"
                  aria-label="Valider la modification du nom"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-foreground flex-1">
                  {sample.name}
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onStartEdit}
                  className="h-6 w-6 p-0"
                  aria-label={`Modifier le nom de ${sample.name}`}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {formatTime(sample.duration)}
            </p>
            {sample.effects && sample.effects.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {sample.effects.map((effect, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary"
                  >
                    {effect}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={sample.isFavorite ? 'default' : 'secondary'}
              onClick={onToggleFavorite}
              className={sample.isFavorite ? 'bg-primary hover:bg-primary/90' : ''}
              aria-label={sample.isFavorite ? `Retirer ${sample.name} des favoris` : `Ajouter ${sample.name} aux favoris`}
            >
              <Star className={`h-4 w-4 ${sample.isFavorite ? 'fill-current' : ''}`} />
            </Button>

            <Button
              size="sm"
              variant={playingId === sample.id ? 'default' : 'secondary'}
              onClick={onPlay}
              className={playingId === sample.id ? 'bg-accent hover:bg-accent/90' : ''}
              style={playingId === sample.id ? { boxShadow: 'var(--glow-play)' } : {}}
              aria-label={playingId === sample.id ? `Arrêter ${sample.name}` : `Lire ${sample.name}`}
            >
              <Play className="h-4 w-4" fill={playingId === sample.id ? 'currentColor' : 'none'} />
            </Button>
            
            <Button
              size="sm"
              variant="secondary"
              onClick={onShare}
              aria-label={`Partager ${sample.name}`}
            >
              <Share2 className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={onShareQR}
              aria-label={`Générer un QR code pour ${sample.name}`}
            >
              <QrCode className="h-4 w-4" />
            </Button>
            
          <Button
            size="sm"
            variant="secondary"
            onClick={onDelete}
            aria-label={`Supprimer ${sample.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          </div>

          {onOpenEffects && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenEffects}
              className="w-full gap-2"
            >
              <Wand2 className="h-4 w-4" />
              Effets
            </Button>
          )}

          <ExportOptions 
            audioBlob={sample.blob} 
            sampleName={sample.name}
          />

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDawExportOpen(true)}
            className="w-full"
          >
            <FileMusic className="h-4 w-4 mr-2" />
            Export DAW
          </Button>

          <Button
            size="sm"
            variant={loopMode ? 'default' : 'secondary'}
            onClick={() => setLoopMode(!loopMode)}
            className="w-full"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Mode Loop
          </Button>
        </div>

        {loopMode && (
          <LoopPlayer audioBlob={sample.blob} name={sample.name} />
        )}

        <div className="pt-3 border-t">
          <AIAnalysisDialog
            sampleName={sample.name}
            duration={sample.duration}
            onNameSelected={(newName) => onSaveEdit(sample.id, newName)}
          />
        </div>

        <DAWExportDialog
          open={dawExportOpen}
          onOpenChange={setDawExportOpen}
          audioBlob={sample.blob}
          sampleName={sample.name}
        />
      </div>
    </Card>
  );
};

// Memoize component to prevent unnecessary re-renders
export const SampleCard = memo(SampleCardComponent, (prevProps, nextProps) => {
  // Custom comparison: only re-render if relevant props change
  return (
    prevProps.sample.id === nextProps.sample.id &&
    prevProps.sample.name === nextProps.sample.name &&
    prevProps.sample.isFavorite === nextProps.sample.isFavorite &&
    prevProps.sample.effects?.length === nextProps.sample.effects?.length &&
    prevProps.playingId === nextProps.playingId &&
    prevProps.editingId === nextProps.editingId &&
    prevProps.editName === nextProps.editName
  );
});
