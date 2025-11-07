-- Fix user_stats and user_analytics database constraints

-- Fix 1: user_stats.user_id - make NOT NULL and add foreign key
-- Clean up any NULL records first
DELETE FROM user_stats WHERE user_id IS NULL;

-- Make user_id mandatory
ALTER TABLE user_stats 
ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE user_stats
ADD CONSTRAINT fk_user_stats_user_id 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Ensure unique constraint (one stats record per user)
ALTER TABLE user_stats
ADD CONSTRAINT unique_user_stats_user_id UNIQUE (user_id);

-- Fix 2: user_analytics - add missing foreign key constraint
ALTER TABLE user_analytics
ADD CONSTRAINT fk_user_analytics_user_id 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;