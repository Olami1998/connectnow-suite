-- Break RLS recursion between scheduled_meetings and meeting_participants.

CREATE OR REPLACE FUNCTION public.is_meeting_host(mid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scheduled_meetings
    WHERE id = mid AND host_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_meeting_invitee(mid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.meeting_participants mp
    JOIN public.profiles p ON lower(p.email) = lower(mp.email)
    WHERE mp.meeting_id = mid AND p.id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_meeting_host(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_meeting_invitee(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_meeting_host(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_meeting_invitee(uuid) TO authenticated;

DROP POLICY IF EXISTS "Hosts and invitees can view meetings" ON public.scheduled_meetings;
DROP POLICY IF EXISTS "Users can view their own meetings" ON public.scheduled_meetings;
CREATE POLICY "Hosts and invitees can view meetings"
  ON public.scheduled_meetings
  FOR SELECT
  USING (auth.uid() = host_id OR public.is_meeting_invitee(id));

DROP POLICY IF EXISTS "Hosts and invitees can view participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Users can view participants of their meetings" ON public.meeting_participants;
CREATE POLICY "Hosts and invitees can view participants"
  ON public.meeting_participants
  FOR SELECT
  USING (public.is_meeting_host(meeting_id) OR public.is_meeting_invitee(meeting_id));

DROP POLICY IF EXISTS "Users can add participants to their meetings" ON public.meeting_participants;
CREATE POLICY "Users can add participants to their meetings"
  ON public.meeting_participants
  FOR INSERT
  WITH CHECK (public.is_meeting_host(meeting_id));

DROP POLICY IF EXISTS "Users can update participants of their meetings" ON public.meeting_participants;
CREATE POLICY "Users can update participants of their meetings"
  ON public.meeting_participants
  FOR UPDATE
  USING (public.is_meeting_host(meeting_id) OR public.is_meeting_invitee(meeting_id));

DROP POLICY IF EXISTS "Users can delete participants from their meetings" ON public.meeting_participants;
CREATE POLICY "Users can delete participants from their meetings"
  ON public.meeting_participants
  FOR DELETE
  USING (public.is_meeting_host(meeting_id));
