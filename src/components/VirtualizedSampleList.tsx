import { memo, useEffect, useState, useRef } from 'react';
import { FixedSizeGrid } from 'react-window';
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

interface VirtualizedSampleListProps {
  samples: AudioSample[];
  playingId: string | null;
  editingId: string | null;
  editName: string;
  onPlay: (sample: AudioSample) => void;
  onToggleFavorite: (id: string) => void;
  onShare: (sample: AudioSample) => void;
  onShareQR: (sample: AudioSample) => void;
  onDelete: (id: string) => void;
  onStartEdit: (sample: AudioSample) => void;
  onSaveEdit: () => void;
  onEditNameChange: (name: string) => void;
  onOpenEffects: (sample: AudioSample) => void;
  formatTime: (seconds: number) => string;
}

const CELL_HEIGHT = 220; // Height of each sample card row
const MIN_SAMPLES_FOR_VIRTUALIZATION = 20; // Only virtualize if we have 20+ samples

const VirtualizedSampleList = memo(({
  samples,
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
}: VirtualizedSampleListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });
  const [columnCount, setColumnCount] = useState(3);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth || 1200;
        const height = containerRef.current.clientHeight || 600;
        
        // Calculate responsive column count
        let cols = 3;
        if (width < 640) cols = 1;
        else if (width < 1024) cols = 2;
        
        setColumnCount(cols);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate grid dimensions
  const rowCount = Math.ceil(samples.length / columnCount);
  const cellWidth = Math.floor(dimensions.width / columnCount);

  // If we have few samples, don't virtualize (better UX and compatibility with drag & drop)
  if (samples.length < MIN_SAMPLES_FOR_VIRTUALIZATION) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {samples.map((sample, index) => (
          <SampleCard
            key={sample.id}
            sample={sample}
            index={index}
            playingId={playingId}
            editingId={editingId}
            editName={editName}
            onPlay={() => onPlay(sample)}
            onToggleFavorite={() => onToggleFavorite(sample.id)}
            onShare={() => onShare(sample)}
            onShareQR={() => onShareQR(sample)}
            onDelete={() => onDelete(sample.id)}
            onStartEdit={() => onStartEdit(sample)}
            onSaveEdit={onSaveEdit}
            onEditNameChange={onEditNameChange}
            onOpenEffects={() => onOpenEffects(sample)}
            formatTime={formatTime}
          />
        ))}
      </div>
    );
  }

  // Virtualized grid for large lists
  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
    const index = rowIndex * columnCount + columnIndex;
    
    if (index >= samples.length) {
      return <div style={style} />;
    }

    const sample = samples[index];

    return (
      <div style={{ ...style, padding: '8px' }}>
        <SampleCard
          key={sample.id}
          sample={sample}
          index={index}
          playingId={playingId}
          editingId={editingId}
          editName={editName}
          onPlay={() => onPlay(sample)}
          onToggleFavorite={() => onToggleFavorite(sample.id)}
          onShare={() => onShare(sample)}
          onShareQR={() => onShareQR(sample)}
          onDelete={() => onDelete(sample.id)}
          onStartEdit={() => onStartEdit(sample)}
          onSaveEdit={onSaveEdit}
          onEditNameChange={onEditNameChange}
          onOpenEffects={() => onOpenEffects(sample)}
          formatTime={formatTime}
        />
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full" style={{ height: '600px' }}>
      <FixedSizeGrid
        columnCount={columnCount}
        columnWidth={cellWidth}
        height={dimensions.height}
        rowCount={rowCount}
        rowHeight={CELL_HEIGHT}
        width={dimensions.width}
        style={{ overflowX: 'hidden' }}
      >
        {Cell}
      </FixedSizeGrid>
    </div>
  );
});

VirtualizedSampleList.displayName = 'VirtualizedSampleList';

export default VirtualizedSampleList;

