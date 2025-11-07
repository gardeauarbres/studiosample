import { memo } from 'react';
import { SampleCard } from './SampleCard';

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
  onSaveEdit: () => void;
  onEditNameChange: (name: string) => void;
  formatTime: (seconds: number) => string;
}

// Memoized component to prevent unnecessary re-renders
export const MemoizedSampleCard = memo(
  SampleCard,
  (prevProps, nextProps) => {
    return (
      prevProps.sample.id === nextProps.sample.id &&
      prevProps.playingId === nextProps.playingId &&
      prevProps.editingId === nextProps.editingId &&
      prevProps.editName === nextProps.editName &&
      prevProps.sample.name === nextProps.sample.name &&
      prevProps.sample.isFavorite === nextProps.sample.isFavorite &&
      prevProps.sample.effects?.length === nextProps.sample.effects?.length
    );
  }
);

MemoizedSampleCard.displayName = 'MemoizedSampleCard';
