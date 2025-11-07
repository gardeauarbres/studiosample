-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create collaborative sessions table
CREATE TABLE IF NOT EXISTS public.collaborative_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  creator_id UUID NOT NULL,
  samples JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session members table
CREATE TABLE IF NOT EXISTS public.session_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collaborative_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_members ENABLE ROW LEVEL SECURITY;

-- Policies for collaborative_sessions
CREATE POLICY "Users can view sessions they're members of"
  ON public.collaborative_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_members
      WHERE session_members.session_id = collaborative_sessions.id
      AND session_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can insert their own sessions"
  ON public.collaborative_sessions FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Editors can update sessions"
  ON public.collaborative_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.session_members
      WHERE session_members.session_id = collaborative_sessions.id
      AND session_members.user_id = auth.uid()
      AND session_members.role IN ('editor', 'owner')
    )
  );

CREATE POLICY "Owners can delete sessions"
  ON public.collaborative_sessions FOR DELETE
  USING (creator_id = auth.uid());

-- Policies for session_members
CREATE POLICY "Users can view members of their sessions"
  ON public.session_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_members sm
      WHERE sm.session_id = session_members.session_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Session owners can manage members"
  ON public.session_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborative_sessions
      WHERE collaborative_sessions.id = session_members.session_id
      AND collaborative_sessions.creator_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborative_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_members;

-- Trigger for updated_at
CREATE TRIGGER update_collaborative_sessions_updated_at
  BEFORE UPDATE ON public.collaborative_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();