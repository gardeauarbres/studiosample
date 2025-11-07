import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url?: string;
  level: number;
  xp: number;
  total_samples: number;
  total_effects: number;
}

export const useLeaderboard = (limit: number = 10) => {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: async () => {
      // Try to use the optimized view first
      let { data, error } = await supabase
        .from('public_leaderboard')
        .select('user_id, username, avatar_url, level, xp, total_samples, total_effects')
        .order('xp', { ascending: false })
        .limit(limit);

      // If the view doesn't exist, use a direct query with JOIN
      if (error && (error.code === 'PGRST116' || error.message?.includes('does not exist'))) {
        const { data: statsData, error: statsError } = await supabase
          .from('user_stats')
          .select(`
            user_id,
            level,
            xp,
            total_samples,
            total_effects,
            profiles!inner(username, avatar_url)
          `)
          .order('xp', { ascending: false })
          .limit(limit);

        if (statsError) throw statsError;

        // Transform the data to match the expected format
        data = statsData?.map((entry: any) => ({
          user_id: entry.user_id,
          username: entry.profiles?.username || `User-${entry.user_id.substring(0, 8)}`,
          avatar_url: entry.profiles?.avatar_url,
          level: entry.level || 1,
          xp: entry.xp || 0,
          total_samples: entry.total_samples || 0,
          total_effects: entry.total_effects || 0,
        })) || [];
      } else if (error) {
        throw error;
      }

      return (data || []) as LeaderboardEntry[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - leaderboard changes less frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Retry once on failure
  });
};
