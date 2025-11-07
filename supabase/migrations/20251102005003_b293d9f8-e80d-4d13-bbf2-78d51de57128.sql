-- 1. Drop the problematic view
DROP VIEW IF EXISTS public.public_leaderboard;

-- 2. Create a regular view without SECURITY DEFINER
CREATE VIEW public.public_leaderboard 
WITH (security_invoker = true) AS
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

-- 3. Create RLS policy for the leaderboard view access
CREATE POLICY "Anyone can view leaderboard"
ON public.user_stats FOR SELECT
TO public
USING (true);

-- 4. Grant access to the view
GRANT SELECT ON public.public_leaderboard TO authenticated;
GRANT SELECT ON public.public_leaderboard TO anon;