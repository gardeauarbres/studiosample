-- 1. Drop policies that reference the role column
DROP POLICY IF EXISTS "Editors can update sessions" ON public.collaborative_sessions;

-- 2. Create enum type for session member roles
CREATE TYPE public.session_role AS ENUM ('owner', 'editor', 'viewer');

-- 3. Remove default, convert column, then set new default
ALTER TABLE public.session_members 
ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.session_members 
ALTER COLUMN role TYPE session_role 
USING role::session_role;

ALTER TABLE public.session_members 
ALTER COLUMN role SET DEFAULT 'viewer'::session_role;

-- 4. Recreate the policy that was dropped
CREATE POLICY "Editors can update sessions"
ON public.collaborative_sessions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM session_members
    WHERE session_members.session_id = collaborative_sessions.id
      AND session_members.user_id = auth.uid()
      AND session_members.role IN ('editor', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM session_members
    WHERE session_members.session_id = collaborative_sessions.id
      AND session_members.user_id = auth.uid()
      AND session_members.role IN ('editor', 'owner')
  )
);

-- 5. Drop the catch-all policy and create explicit policies
DROP POLICY IF EXISTS "Session owners can manage members" ON public.session_members;

-- 6. Create explicit INSERT policy
CREATE POLICY "Owners can add members"
ON public.session_members FOR INSERT
TO authenticated
WITH CHECK (is_session_owner(auth.uid(), session_id));

-- 7. Create explicit UPDATE policy
CREATE POLICY "Owners can update member roles"
ON public.session_members FOR UPDATE
TO authenticated
USING (is_session_owner(auth.uid(), session_id))
WITH CHECK (is_session_owner(auth.uid(), session_id));

-- 8. Create explicit DELETE policy for owners
CREATE POLICY "Owners can remove members"
ON public.session_members FOR DELETE
TO authenticated
USING (is_session_owner(auth.uid(), session_id));

-- 9. Allow members to remove themselves
CREATE POLICY "Members can remove themselves"
ON public.session_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 10. Restrict user_stats access - remove public viewing
DROP POLICY IF EXISTS "Anyone can view user stats" ON public.user_stats;

-- 11. Enhance session name validation
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
  
  -- Strengthened validation: block script tags, HTML, and special characters
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