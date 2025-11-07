-- 1. Create public view for scores and badges only
CREATE OR REPLACE VIEW public.public_leaderboard AS
SELECT 
  us.user_id,
  p.username,
  p.avatar_url,
  us.level,
  us.xp,
  us.total_samples,
  us.total_effects
FROM user_stats us
LEFT JOIN profiles p ON p.id = us.user_id;

-- 2. Grant access to the view
GRANT SELECT ON public.public_leaderboard TO authenticated;
GRANT SELECT ON public.public_leaderboard TO anon;

-- 3. Restrict profiles table - remove public access
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- 4. Keep authenticated users able to view all profiles (for collaboration features)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 5. Add RLS policy for the leaderboard to be publicly readable
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Note: The "Users can view their own stats" policy already exists and allows owners to see full stats
-- The public_leaderboard view will bypass RLS since it's a view created by a superuser