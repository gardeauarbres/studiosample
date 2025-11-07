-- Fix infinite recursion in session_members RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Session owners can manage members" ON public.session_members;
DROP POLICY IF EXISTS "Users can view members of their sessions" ON public.session_members;

-- Create security definer function to check session membership
CREATE OR REPLACE FUNCTION public.is_session_member(_user_id uuid, _session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM session_members
    WHERE session_id = _session_id
    AND user_id = _user_id
  );
$$;

-- Create security definer function to check session ownership
CREATE OR REPLACE FUNCTION public.is_session_owner(_user_id uuid, _session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM collaborative_sessions
    WHERE id = _session_id
    AND creator_id = _user_id
  );
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Session owners can manage members"
ON public.session_members FOR ALL
USING (public.is_session_owner(auth.uid(), session_id));

CREATE POLICY "Users can view session members"
ON public.session_members FOR SELECT
USING (public.is_session_member(auth.uid(), session_id));