import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { downloadAudioFromStorage } from '@/utils/storageUtils';

interface Sample {
  id: string;
  user_id: string;
  name: string;
  duration: number;
  timestamp: number;
  is_favorite: boolean;
  effects: string[];
  blob_data: string;
  mime_type?: string;
}

export interface SampleWithBlob extends Omit<Sample, 'blob_data'> {
  blob?: Blob;
}

const PAGE_SIZE = 20; // Nombre de samples par page

export const useInfiniteSamples = (userId?: string) => {
  const queryClient = useQueryClient();

  // Infinite query for pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['samples', 'infinite', userId],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      if (!userId) throw new Error('No user ID');

      // Essayer d'abord avec storage_path
      let selectFields = 'id, user_id, name, duration, timestamp, created_at, is_favorite, effects, mime_type, storage_path';
      let { data: samplesData, error: samplesError } = await supabase
        .from('samples')
        .select(selectFields)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      // Si erreur liée à storage_path, réessayer sans
      if (samplesError && (samplesError.message?.includes('storage_path') || samplesError.message?.includes('does not exist'))) {
        console.warn('storage_path column not found, retrying without it');
        selectFields = 'id, user_id, name, duration, timestamp, created_at, is_favorite, effects, mime_type';
        const retry = await supabase
          .from('samples')
          .select(selectFields)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE - 1);
        
        if (retry.error) throw retry.error;
        samplesData = retry.data;
        
        // Sans storage_path, on ne peut pas charger les blobs
        return {
          samples: [],
          nextPage: null,
        };
      }

      if (samplesError) throw samplesError;

      // Vérifier si storage_path est disponible dans les données
      if (!samplesData || samplesData.length === 0) {
        return {
          samples: [],
          nextPage: null,
        };
      }
      
      const hasStoragePath = samplesData.some((s: any) => 'storage_path' in s);
      if (!hasStoragePath) {
        console.warn('storage_path column not available, samples cannot be loaded');
        return {
          samples: [],
          nextPage: null,
        };
      }
      
      // Charger les blobs depuis Storage uniquement
      // Note: blob_data (bytea) ne peut pas être sérialisé en JSON par PostgREST
      const samplesWithBlobs: SampleWithBlob[] = await Promise.all(
        (samplesData || []).map(async (sample: any) => {
          let blob: Blob | undefined;
          
          // Charger uniquement depuis Storage
          if (sample.storage_path) {
            blob = await downloadAudioFromStorage(sample.storage_path) || undefined;
          }
          
          // Si pas de storage_path, le sample ne peut pas être chargé (nécessite migration)
          if (!blob && !sample.storage_path) {
            console.warn(`Sample ${sample.id} n'a pas de storage_path, ignoré (nécessite migration)`);
          }
          
          return {
            id: sample.id,
            user_id: sample.user_id,
            name: sample.name,
            duration: sample.duration,
            timestamp: sample.timestamp,
            is_favorite: sample.is_favorite || false,
            effects: sample.effects || [],
            blob,
          };
        })
      );
      
      // Filtrer les samples sans blob (sans storage_path)
      const validSamples = samplesWithBlobs.filter(s => s.blob !== undefined);

      return {
        samples: validSamples,
        nextPage: validSamples.length === PAGE_SIZE ? pageParam + PAGE_SIZE : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: { samples: any[]; nextPage: number | null }) => lastPage.nextPage,
    enabled: !!userId,
    staleTime: 0, // Toujours considérer comme stale pour forcer le refetch après invalidation
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch quand la fenêtre reprend le focus
  });

  // Flatten pages into single array
  const samples = data?.pages.flatMap((page: { samples: any[] }) => page.samples) ?? [];

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ sampleId, isFavorite }: { sampleId: string; isFavorite: boolean }) => {
      const { data, error } = await supabase
        .from('samples')
        .update({ is_favorite: !isFavorite })
        .eq('id', sampleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ sampleId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['samples', 'infinite', userId] });
      const previousData = queryClient.getQueryData(['samples', 'infinite', userId]);

      queryClient.setQueryData(['samples', 'infinite', userId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            samples: page.samples.map((sample: any) =>
              sample.id === sampleId ? { ...sample, is_favorite: !isFavorite } : sample
            ),
          })),
        };
      });

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['samples', 'infinite', userId], context?.previousData);
      toast.error('Erreur lors de la mise à jour du favori');
    },
    onSuccess: () => {
      toast.success('Favori mis à jour');
      queryClient.invalidateQueries({ queryKey: ['userStats', userId] });
    },
  });

  // Delete sample mutation
  const deleteSampleMutation = useMutation({
    mutationFn: async (sampleId: string) => {
      // Récupérer le storage_path avant de supprimer (si la colonne existe)
      let storagePath: string | null = null;
      try {
        const { data: sampleData, error: fetchError } = await supabase
          .from('samples')
          .select('storage_path')
          .eq('id', sampleId)
          .single();

        if (!fetchError && sampleData?.storage_path) {
          storagePath = sampleData.storage_path;
        }
      } catch (err: any) {
        // Si la colonne n'existe pas, on continue sans supprimer le fichier Storage
        if (err?.message?.includes('storage_path') || err?.message?.includes('does not exist')) {
          console.warn('storage_path column not available, skipping Storage file deletion');
        }
      }

      // Supprimer le fichier Storage si présent
      if (storagePath) {
        const { deleteAudioFromStorage } = await import('@/utils/storageUtils');
        await deleteAudioFromStorage(storagePath);
      }

      // Supprimer de la DB
      const { error } = await supabase
        .from('samples')
        .delete()
        .eq('id', sampleId);

      if (error) throw error;
    },
    onMutate: async (sampleId) => {
      await queryClient.cancelQueries({ queryKey: ['samples', 'infinite', userId] });
      const previousData = queryClient.getQueryData(['samples', 'infinite', userId]);

      queryClient.setQueryData(['samples', 'infinite', userId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            samples: page.samples.filter((sample: any) => sample.id !== sampleId),
          })),
        };
      });

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['samples', 'infinite', userId], context?.previousData);
      toast.error('Erreur lors de la suppression');
    },
    onSuccess: () => {
      toast.success('Sample supprimé');
      queryClient.invalidateQueries({ queryKey: ['userStats', userId] });
    },
  });

  return {
    samples,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    toggleFavorite: toggleFavoriteMutation.mutate,
    deleteSample: deleteSampleMutation.mutate,
    isToggling: toggleFavoriteMutation.isPending,
    isDeleting: deleteSampleMutation.isPending,
  };
};

