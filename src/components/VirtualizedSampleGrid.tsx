import { memo, useEffect, useState, useRef } from 'react';
import { FixedSizeGrid } from 'react-window';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Trash2 } from 'lucide-react';

interface AudioSample {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  timestamp: number;
  effects?: string[];
  isFavorite: boolean; // Rendre obligatoire pour cohérence avec AudioRecorder
}

interface VirtualizedSampleGridProps {
  samples: AudioSample[];
  onSamplePlay: (sample: AudioSample) => void;
  onSampleToggleFavorite?: (id: string) => void;
  onSampleDelete?: (id: string) => void;
  viewMode: 'grid' | 'list';
}

const CELL_HEIGHT = 180;
const MIN_SAMPLES_FOR_VIRTUALIZATION = 15;

const VirtualizedSampleGrid = memo(({
  samples,
  onSamplePlay,
  onSampleToggleFavorite,
  onSampleDelete,
  viewMode,
}: VirtualizedSampleGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 400 });
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth || 1200;
        const height = containerRef.current.clientHeight || 400;
        
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

  const rowCount = Math.ceil(samples.length / columnCount);
  const cellWidth = Math.floor(dimensions.width / columnCount);

  // If we have few samples or list mode, don't virtualize
  if (samples.length < MIN_SAMPLES_FOR_VIRTUALIZATION || viewMode === 'list') {
    return (
      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
        {samples.map((sample) => (
          <Card 
            key={sample.id}
            className="border-2 border-border hover:border-primary/50 transition-all cursor-pointer"
            onClick={() => onSamplePlay(sample)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-foreground truncate">
                    {sample.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {Math.floor(sample.duration / 60)}:{(sample.duration % 60).toString().padStart(2, '0')}
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
                <div className="flex gap-2">
                  {sample.isFavorite && (
                    <Star className="h-5 w-5 fill-primary text-primary" />
                  )}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSampleToggleFavorite?.(sample.id);
                      }}
                    >
                      <Star className={`h-4 w-4 ${sample.isFavorite ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSampleDelete?.(sample.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Virtualized grid
  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
    const index = rowIndex * columnCount + columnIndex;
    
    if (index >= samples.length) {
      return <div style={style} />;
    }

    const sample = samples[index];

    return (
      <div style={{ ...style, padding: '8px' }}>
        <Card 
          className="border-2 border-border hover:border-primary/50 transition-all cursor-pointer h-full"
          onClick={() => onSamplePlay(sample)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-foreground truncate">
                  {sample.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {Math.floor(sample.duration / 60)}:{(sample.duration % 60).toString().padStart(2, '0')}
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
              <div className="flex gap-2">
                {sample.isFavorite && (
                  <Star className="h-5 w-5 fill-primary text-primary" />
                )}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSampleToggleFavorite?.(sample.id);
                    }}
                  >
                    <Star className={`h-4 w-4 ${sample.isFavorite ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSampleDelete?.(sample.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full" style={{ height: '400px' }}>
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

VirtualizedSampleGrid.displayName = 'VirtualizedSampleGrid';

export default VirtualizedSampleGrid;

