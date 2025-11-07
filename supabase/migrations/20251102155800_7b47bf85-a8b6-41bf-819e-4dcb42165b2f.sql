-- Add mime_type column to samples table
ALTER TABLE public.samples 
ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'audio/webm';