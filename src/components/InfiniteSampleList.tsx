import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInfiniteSamples } from '@/hooks/useInfiniteSamples';
import { SampleCard } from './SampleCard';
import type { AudioSample } from './AudioRecorder';

interface InfiniteSampleListProps {
  userId: string;
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

export const InfiniteSampleList = ({
  userId,
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
}: InfiniteSampleListProps) => {
  const {
    samples,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    toggleFavorite: toggleFavoriteMutation,
    deleteSample: deleteSampleMutation,
  } = useInfiniteSamples(userId);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Aucun sample enregistré. Commencez votre premier enregistrement !</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {samples.map((sample, index) => {
          // Convertir le format de la DB (snake_case) vers le format frontend (camelCase)
          const audioSample: AudioSample = {
            id: sample.id,
            name: sample.name,
            blob: sample.blob!,
            duration: sample.duration,
            timestamp: sample.timestamp,
            isFavorite: (sample as any).is_favorite ?? false,
            effects: sample.effects || [],
          };
          
          return (
          <SampleCard
            key={sample.id}
            sample={audioSample}
            index={index}
            playingId={playingId}
            editingId={editingId}
            editName={editName}
            onPlay={() => onPlay(audioSample)}
            onToggleFavorite={() => {
              toggleFavoriteMutation({ 
                sampleId: audioSample.id, 
                isFavorite: audioSample.isFavorite 
              });
              onToggleFavorite(audioSample.id); // Callback pour feedback audio
            }}
            onShare={() => onShare(audioSample)}
            onShareQR={() => onShareQR(audioSample)}
            onDelete={() => {
              deleteSampleMutation(audioSample.id);
              onDelete(audioSample.id); // Callback pour feedback audio
            }}
            onStartEdit={() => onStartEdit(audioSample)}
            onSaveEdit={onSaveEdit}
            onEditNameChange={onEditNameChange}
            onOpenEffects={() => onOpenEffects(audioSample)}
            formatTime={formatTime}
          />
          );
        })}
      </div>

      {/* Load more trigger */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isFetchingNextPage ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <Button
              onClick={() => fetchNextPage()}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Charger plus de samples
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

