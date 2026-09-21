-- Google OAuth tokens must not be readable or writable from the browser client.
DROP POLICY IF EXISTS "Users can insert their own tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.google_tokens;

REVOKE ALL ON public.google_tokens FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
