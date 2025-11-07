import { useState } from 'react';
import { cn } from '@/lib/utils';
import { SampleWithBlob } from '@/hooks/useSamples';

interface SequencerDropZoneProps {
  onDrop: (sample: SampleWithBlob) => void;
  samples: SampleWithBlob[];
}

export const SequencerDropZone = ({ onDrop, samples }: SequencerDropZoneProps) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    
    const sampleId = e.dataTransfer?.getData('sample-id');
    if (sampleId) {
      const sample = samples.find(s => s.id === sampleId);
      if (sample && sample.blob) {
        onDrop(sample);
      }
    }
  };

  return (
    <div
      id="sequencer-drop-zone"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "text-center py-12 border-2 border-dashed rounded-lg transition-all cursor-pointer",
        isOver
          ? "border-primary bg-primary/10 scale-105"
          : "border-border text-muted-foreground hover:border-primary/50"
      )}
    >
      <p className={cn(isOver && "text-primary font-semibold")}>
        {isOver 
          ? "Déposez le sample ici pour créer une piste" 
          : "Aucune piste. Glissez-déposez un sample ici ou cliquez sur un bouton ci-dessus pour commencer."}
      </p>
    </div>
  );
};

