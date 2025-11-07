import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserStats {
  user_id: string;
  total_samples: number;
  total_effects: number;
  favorites: number;
  level: number;
  xp: number;
}

export const useUserStats = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  // Fetch user stats with caching
  const {
    data: userStats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['userStats', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('user_stats')
        .select('user_id, total_samples, total_effects, favorites, level, xp')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      // Create stats if they don't exist
      if (!data) {
        const { data: newStats, error: insertError } = await supabase
          .from('user_stats')
          .insert({
            user_id: userId,
            total_samples: 0,
            total_effects: 0,
            favorites: 0,
            level: 1,
            xp: 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newStats;
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 0, // Toujours considérer comme stale pour forcer le refetch après invalidation
    gcTime: 15 * 60 * 1000, // 15 minutes (optimisé)
    refetchOnWindowFocus: true, // Refetch quand la fenêtre reprend le focus
  });

  // Update user stats mutation
  const updateStatsMutation = useMutation({
    mutationFn: async (stats: Partial<UserStats>) => {
      if (!userId) throw new Error('No user ID');

      // Build DB object explicitly to ensure correct field mapping
      const dbStats: any = {
        user_id: userId,
      };
      
      // Map fields explicitly (already in snake_case, but ensure all fields are handled)
      if (stats.total_samples !== undefined) dbStats.total_samples = stats.total_samples;
      if (stats.total_effects !== undefined) dbStats.total_effects = stats.total_effects;
      if (stats.favorites !== undefined) dbStats.favorites = stats.favorites;
      if (stats.level !== undefined) dbStats.level = stats.level;
      if (stats.xp !== undefined) dbStats.xp = stats.xp;

      const { data, error } = await supabase
        .from('user_stats')
        .upsert(dbStats, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating stats:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userStats', userId], data);
    },
    onError: (error: any) => {
      console.error('Error updating stats:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      toast.error('Erreur lors de la mise à jour des statistiques', {
        description: errorMessage,
      });
    },
  });

  return {
    userStats,
    isLoading,
    error,
    updateStats: updateStatsMutation.mutate,
    isUpdating: updateStatsMutation.isPending,
  };
};
