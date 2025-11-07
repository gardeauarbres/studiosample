-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_samples_user_id ON public.samples(user_id);
CREATE INDEX IF NOT EXISTS idx_samples_created_at ON public.samples(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_samples_is_favorite ON public.samples(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_samples_user_favorite ON public.samples(user_id, is_favorite, created_at DESC);