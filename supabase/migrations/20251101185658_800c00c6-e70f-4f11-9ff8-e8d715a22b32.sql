-- Add analytics fields to track creation patterns
ALTER TABLE public.samples
ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS genre_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS session_duration integer DEFAULT 0;

-- Create analytics aggregations table
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  samples_created integer DEFAULT 0,
  ai_samples_created integer DEFAULT 0,
  effects_applied integer DEFAULT 0,
  session_time_minutes integer DEFAULT 0,
  favorite_genres text[] DEFAULT '{}',
  most_used_effects text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own analytics"
ON public.user_analytics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
ON public.user_analytics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics"
ON public.user_analytics FOR UPDATE
USING (auth.uid() = user_id);

-- Create updated_at trigger for user_analytics
CREATE TRIGGER update_user_analytics_updated_at
BEFORE UPDATE ON public.user_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_date ON public.user_analytics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_samples_user_created ON public.samples(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_samples_genre_tags ON public.samples USING GIN(genre_tags);