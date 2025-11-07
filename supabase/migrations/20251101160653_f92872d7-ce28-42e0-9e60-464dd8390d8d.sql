-- Create table for storing samples in the cloud
CREATE TABLE public.samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration REAL NOT NULL,
  timestamp BIGINT NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  effects TEXT[],
  blob_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;

-- Create policies for samples
CREATE POLICY "Users can view their own samples"
ON public.samples FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own samples"
ON public.samples FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own samples"
ON public.samples FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own samples"
ON public.samples FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_samples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_samples_timestamp
BEFORE UPDATE ON public.samples
FOR EACH ROW
EXECUTE FUNCTION public.update_samples_updated_at();

-- Create table for user stats
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_samples INTEGER DEFAULT 0,
  total_effects INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for user_stats
CREATE POLICY "Users can view their own stats"
ON public.user_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stats"
ON public.user_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
ON public.user_stats FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for stats timestamp
CREATE TRIGGER update_user_stats_timestamp
BEFORE UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_samples_updated_at();