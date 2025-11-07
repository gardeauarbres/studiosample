-- Enable realtime for samples table to sync stats automatically
ALTER TABLE public.samples REPLICA IDENTITY FULL;

-- Add samples table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.samples;