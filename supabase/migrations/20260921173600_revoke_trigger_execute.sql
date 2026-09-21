REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lock_profile_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.meeting_participant_update_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_email_from_auth() FROM PUBLIC, anon, authenticated;
