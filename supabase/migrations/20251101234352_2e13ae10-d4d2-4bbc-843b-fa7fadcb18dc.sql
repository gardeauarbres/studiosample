-- Allow all authenticated users to view other users' stats for leaderboard
CREATE POLICY "Anyone can view user stats"
ON public.user_stats
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to view other users' profiles for leaderboard
CREATE POLICY "Anyone can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);