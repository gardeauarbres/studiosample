import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
}

export interface SampleWithBlob extends Omit<Sample, 'blob_data'> {
  blob?: Blob;
}

export const useSamples = (userId?: string) => {
  const queryClient = useQueryClient();

  // Fetch samples with pagination and caching
  const {
    data: samples,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['samples', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');

      // Essayer d'abord avec storage_path
      let selectFields = 'id, user_id, name, duration, timestamp, created_at, is_favorite, effects, mime_type, storage_path';
      let { data, error } = await supabase
        .from('samples')
        .select(selectFields)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      // Si erreur liée à storage_path, réessayer sans
      if (error && (error.message?.includes('storage_path') || error.message?.includes('does not exist'))) {
        console.warn('storage_path column not found, retrying without it');
        selectFields = 'id, user_id, name, duration, timestamp, created_at, is_favorite, effects, mime_type';
        const retry = await supabase
          .from('samples')
          .select(selectFields)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (retry.error) throw retry.error;
        data = retry.data;
        
        // Sans storage_path, on ne peut pas charger les blobs
        return [];
      }

      if (error) throw error;
      
      // Vérifier si storage_path est disponible dans les données
      if (!data || data.length === 0) {
        return [];
      }
      
      const hasStoragePath = data.some((s: any) => 'storage_path' in s);
      if (!hasStoragePath) {
        console.warn('storage_path column not available, samples cannot be loaded');
        return [];
      }
      
      // Charger les blobs depuis Storage uniquement
      // Note: blob_data (bytea) ne peut pas être sérialisé en JSON par PostgREST
      const samplesWithBlobs: SampleWithBlob[] = await Promise.all(
        (data || []).map(async (sample: any) => {
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
      return samplesWithBlobs.filter(s => s.blob !== undefined);
    },
    enabled: !!userId,
    staleTime: 0, // Toujours considérer comme stale pour forcer le refetch après invalidation
    gcTime: 10 * 60 * 1000, // 10 minutes (optimisé)
    refetchOnWindowFocus: true, // Refetch quand la fenêtre reprend le focus
  });

  // Toggle favorite mutation with optimistic update
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
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['samples', userId] });

      // Snapshot previous value
      const previousSamples = queryClient.getQueryData(['samples', userId]);

      // Optimistically update
      queryClient.setQueryData(['samples', userId], (old: any) =>
        old?.map((sample: any) =>
          sample.id === sampleId ? { ...sample, is_favorite: !isFavorite } : sample
        )
      );

      return { previousSamples };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['samples', userId], context?.previousSamples);
      toast.error('Erreur lors de la mise à jour du favori');
    },
    onSuccess: () => {
      toast.success('Favori mis à jour');
      // Invalidate stats cache to force refresh
      queryClient.invalidateQueries({ queryKey: ['userStats', userId] });
    },
  });

  // Delete sample mutation
  const deleteSampleMutation = useMutation({
    mutationFn: async (sampleId: string) => {
      const { error } = await supabase
        .from('samples')
        .delete()
        .eq('id', sampleId);

      if (error) throw error;
    },
    onMutate: async (sampleId) => {
      await queryClient.cancelQueries({ queryKey: ['samples', userId] });
      const previousSamples = queryClient.getQueryData(['samples', userId]);

      queryClient.setQueryData(['samples', userId], (old: any) =>
        old?.filter((sample: any) => sample.id !== sampleId)
      );

      return { previousSamples };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['samples', userId], context?.previousSamples);
      toast.error('Erreur lors de la suppression');
    },
    onSuccess: () => {
      toast.success('Sample supprimé');
      // Invalidate stats cache to force refresh
      queryClient.invalidateQueries({ queryKey: ['userStats', userId] });
    },
  });

  return {
    samples,
    isLoading,
    error,
    toggleFavorite: toggleFavoriteMutation.mutate,
    deleteSample: deleteSampleMutation.mutate,
    isToggling: toggleFavoriteMutation.isPending,
    isDeleting: deleteSampleMutation.isPending,
  };
};
