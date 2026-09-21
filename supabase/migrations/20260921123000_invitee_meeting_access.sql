-- Invitees can read meetings they were added to (by profile email).
DROP POLICY IF EXISTS "Users can view their own meetings" ON public.scheduled_meetings;

CREATE POLICY "Hosts and invitees can view meetings"
  ON public.scheduled_meetings
  FOR SELECT
  USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1
      FROM public.meeting_participants mp
      JOIN public.profiles p ON lower(p.email) = lower(mp.email)
      WHERE mp.meeting_id = scheduled_meetings.id
        AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view participants of their meetings" ON public.meeting_participants;

CREATE POLICY "Hosts and invitees can view participants"
  ON public.meeting_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_meetings sm
      WHERE sm.id = meeting_id AND sm.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND lower(p.email) = lower(meeting_participants.email)
    )
  );

CREATE POLICY "Invitees can RSVP"
  ON public.meeting_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND lower(p.email) = lower(meeting_participants.email)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND lower(p.email) = lower(meeting_participants.email)
    )
  );
