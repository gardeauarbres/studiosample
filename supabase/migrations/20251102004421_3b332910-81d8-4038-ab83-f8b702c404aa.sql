-- 1. Drop ALL existing policies on session_members to start fresh
DROP POLICY IF EXISTS "Session owners can manage members" ON public.session_members;
DROP POLICY IF EXISTS "Owners can add members" ON public.session_members;
DROP POLICY IF EXISTS "Owners can update member roles" ON public.session_members;
DROP POLICY IF EXISTS "Owners can remove members" ON public.session_members;
DROP POLICY IF EXISTS "Members can remove themselves" ON public.session_members;
DROP POLICY IF EXISTS "Users can view session members" ON public.session_members;

--2. Drop policy on collaborative_sessions
DROP POLICY IF EXISTS "Editors can update sessions" ON public.collaborative_sessions;

-- 3. Convert column type (idempotent check)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_members' 
    AND column_name = 'role' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE public.session_members ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE public.session_members ALTER COLUMN role TYPE session_role USING role::session_role;
    ALTER TABLE public.session_members ALTER COLUMN role SET DEFAULT 'viewer'::session_role;
  END IF;
END $$;

-- 4. Recreate policy on collaborative_sessions
CREATE POLICY "Editors can update sessions"
ON public.collaborative_sessions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM session_members
    WHERE session_members.session_id = collaborative_sessions.id
      AND session_members.user_id = auth.uid()
      AND session_members.role IN ('editor', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM session_members
    WHERE session_members.session_id = collaborative_sessions.id
      AND session_members.user_id = auth.uid()
      AND session_members.role IN ('editor', 'owner')
  )
);

-- 5. Create explicit policies for session_members
CREATE POLICY "Owners can add members"
ON public.session_members FOR INSERT
TO authenticated
WITH CHECK (is_session_owner(auth.uid(), session_id));

CREATE POLICY "Owners can update member roles"
ON public.session_members FOR UPDATE
TO authenticated
USING (is_session_owner(auth.uid(), session_id))
WITH CHECK (is_session_owner(auth.uid(), session_id));

CREATE POLICY "Owners can remove members"
ON public.session_members FOR DELETE
TO authenticated
USING (is_session_owner(auth.uid(), session_id));

CREATE POLICY "Members can remove themselves"
ON public.session_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view session members"
ON public.session_members FOR SELECT
TO authenticated
USING (is_session_member(auth.uid(), session_id));

-- 6. Restrict user_stats access
DROP POLICY IF EXISTS "Anyone can view user stats" ON public.user_stats;

-- 7. Enhanced session name validation
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
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_trimmed_name := TRIM(p_name);
  
  IF v_trimmed_name = '' THEN
    RAISE EXCEPTION 'Session name cannot be empty';
  END IF;
  
  IF LENGTH(v_trimmed_name) > 100 THEN
    RAISE EXCEPTION 'Session name must be less than 100 characters';
  END IF;
  
  IF v_trimmed_name !~ '^[a-zA-Z0-9 \-_]+$' OR 
     v_trimmed_name ~* '(<|>|script|javascript|on\w+=|&lt;|&gt;)' THEN
    RAISE EXCEPTION 'Session name contains invalid characters';
  END IF;

  INSERT INTO public.collaborative_sessions (name, creator_id, samples, settings)
  VALUES (v_trimmed_name, v_user_id, p_samples, p_settings)
  RETURNING collaborative_sessions.id INTO v_session_id;

  INSERT INTO public.session_members (session_id, user_id, role)
  VALUES (v_session_id, v_user_id, 'owner');

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