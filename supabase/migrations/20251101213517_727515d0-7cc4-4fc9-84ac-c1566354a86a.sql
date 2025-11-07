-- Create function to create session with automatic membership
CREATE OR REPLACE FUNCTION public.create_collaborative_session(
  p_name TEXT,
  p_samples JSONB DEFAULT '[]'::jsonb,
  p_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  creator_id UUID,
  samples JSONB,
  settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the session
  INSERT INTO public.collaborative_sessions (name, creator_id, samples, settings)
  VALUES (p_name, v_user_id, p_samples, p_settings)
  RETURNING collaborative_sessions.id INTO v_session_id;

  -- Add creator as owner member
  INSERT INTO public.session_members (session_id, user_id, role)
  VALUES (v_session_id, v_user_id, 'owner');

  -- Return the created session
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.creator_id,
    s.samples,
    s.settings,
    s.created_at,
    s.updated_at
  FROM public.collaborative_sessions s
  WHERE s.id = v_session_id;
END;
$$;