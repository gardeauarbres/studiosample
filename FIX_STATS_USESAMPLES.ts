// ============================================
// CORRECTION : useSamples.ts
// Ajouter la mise à jour des stats après chaque action
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  const { data: samples, isLoading, error } = useQuery({
    queryKey: ['samples', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('samples')
        .select('id, user_id, name, duration, timestamp, is_favorite, effects')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as SampleWithBlob[];
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Helper function pour recalculer les stats
  const recalculateStats = async () => {
    if (!userId) return;

    try {
      // Count samples
      const { count: samplesCount } = await supabase
        .from('samples')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Count favorites
      const { count: favoritesCount } = await supabase
        .from('samples')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_favorite', true);

      // Sum effects
      const { data: samplesData } = await supabase
        .from('samples')
        .select('effects')
        .eq('user_id', userId);

      const totalEffects = samplesData?.reduce((sum, s) => sum + (s.effects?.length || 0), 0) || 0;

      // Get current stats
      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('level, xp')
        .eq('user_id', userId)
        .maybeSingle();

      // Update stats
      const { error: updateError } = await supabase
        .from('user_stats')
        .upsert({
          user_id: userId,
          total_samples: samplesCount || 0,
          total_effects: totalEffects,
          favorites: favoritesCount || 0,
          level: currentStats?.level || 1,
          xp: currentStats?.xp || 0,
        }, { onConflict: 'user_id' });

      if (updateError) {
        console.error('Error updating stats:', updateError);
      } else {
        // Invalider le cache des stats pour forcer le refresh
        queryClient.invalidateQueries({ queryKey: ['userStats', userId] });
      }
    } catch (error) {
      console.error('Error recalculating stats:', error);
    }
  };

  // Toggle favorite mutation - CORRECTION
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
      await queryClient.cancelQueries({ queryKey: ['samples', userId] });
      const previousSamples = queryClient.getQueryData(['samples', userId]);

      queryClient.setQueryData(['samples', userId], (old: any) =>
        old?.map((sample: any) =>
          sample.id === sampleId ? { ...sample, is_favorite: !isFavorite } : sample
        )
      );

      return { previousSamples };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['samples', userId], context?.previousSamples);
      toast.error('Erreur lors de la mise à jour du favori');
    },
    onSuccess: () => {
      toast.success('Favori mis à jour');
      // ✅ CORRECTION : Recalculer les stats après toggle
      recalculateStats();
    },
  });

  // Delete sample mutation - CORRECTION
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
    onError: (err, variables, context) => {
      queryClient.setQueryData(['samples', userId], context?.previousSamples);
      toast.error('Erreur lors de la suppression');
    },
    onSuccess: () => {
      toast.success('Sample supprimé');
      // ✅ CORRECTION : Recalculer les stats après suppression
      recalculateStats();
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

