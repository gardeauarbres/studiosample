// ============================================
// CORRECTION : useUserStats.ts
// ============================================
// Problème : Mapping incorrect camelCase → snake_case
// Solution : Convertir explicitement les clés

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
        .select('*')
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

        if (insertError) {
          console.error('Error creating stats:', insertError);
          throw insertError;
        }
        return newStats;
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Update user stats mutation - CORRECTION ICI
  const updateStatsMutation = useMutation({
    mutationFn: async (stats: Partial<UserStats>) => {
      if (!userId) throw new Error('No user ID');

      // ✅ CORRECTION : Construire l'objet explicitement avec snake_case
      const dbStats: any = {
        user_id: userId,
      };
      
      // Convertir explicitement chaque champ
      if (stats.total_samples !== undefined) {
        dbStats.total_samples = stats.total_samples;
      }
      if (stats.total_effects !== undefined) {
        dbStats.total_effects = stats.total_effects;
      }
      if (stats.favorites !== undefined) {
        dbStats.favorites = stats.favorites;
      }
      if (stats.level !== undefined) {
        dbStats.level = stats.level;
      }
      if (stats.xp !== undefined) {
        dbStats.xp = stats.xp;
      }

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
      // Mettre à jour le cache React Query
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
    updateStatsAsync: updateStatsMutation.mutateAsync, // Pour les cas où on a besoin d'attendre
    isUpdating: updateStatsMutation.isPending,
  };
};

