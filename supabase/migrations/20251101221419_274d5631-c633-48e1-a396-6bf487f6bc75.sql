-- Fix 1: Make samples.user_id NOT NULL and add foreign key constraint
-- Update any existing NULL user_id values to a fallback (first user in system)
UPDATE samples 
SET user_id = (SELECT id FROM auth.users LIMIT 1) 
WHERE user_id IS NULL;

-- Make user_id NOT NULL
ALTER TABLE samples 
ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE samples
ADD CONSTRAINT fk_samples_user_id 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Fix 2: Restrict profile access - require authentication
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Authenticated users can view profiles" 
ON profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- Fix 3: Add server-side validation for session names in create_collaborative_session
CREATE OR REPLACE FUNCTION public.create_collaborative_session(
  p_name text, 
  p_samples jsonb DEFAULT '[]'::jsonb, 
  p_settings jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(id uuid, name text, creator_id uuid, samples jsonb, settings jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session_id UUID;
  v_user_id UUID;
  v_trimmed_name TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate and sanitize session name
  v_trimmed_name := TRIM(p_name);
  
  IF v_trimmed_name = '' THEN
    RAISE EXCEPTION 'Session name cannot be empty';
  END IF;
  
  IF LENGTH(v_trimmed_name) > 100 THEN
    RAISE EXCEPTION 'Session name must be less than 100 characters';
  END IF;
  
  -- Only allow alphanumeric, spaces, hyphens, apostrophes, and underscores
  IF v_trimmed_name !~ '^[a-zA-Z0-9 \-''_]+$' THEN
    RAISE EXCEPTION 'Session name contains invalid characters';
  END IF;

  -- Create the session with validated name
  INSERT INTO public.collaborative_sessions (name, creator_id, samples, settings)
  VALUES (v_trimmed_name, v_user_id, p_samples, p_settings)
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