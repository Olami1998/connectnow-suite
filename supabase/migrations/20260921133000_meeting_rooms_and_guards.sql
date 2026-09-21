-- Live meeting rooms. Host privilege is a hashed token or scheduled host_user_id.
CREATE TABLE public.meeting_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Meeting Room',
  host_token_hash TEXT NOT NULL,
  host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admitted TEXT[] NOT NULL DEFAULT '{}',
  kicked TEXT[] NOT NULL DEFAULT '{}',
  waiting_room_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  allow_chat BOOLEAN NOT NULL DEFAULT TRUE,
  allow_screen_share BOOLEAN NOT NULL DEFAULT TRUE,
  allow_reactions BOOLEAN NOT NULL DEFAULT TRUE,
  mute_epoch INTEGER NOT NULL DEFAULT 0,
  host_peer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.meeting_rooms ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.meeting_rooms FROM anon, authenticated, PUBLIC;

ALTER TABLE public.meeting_rooms REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_rooms;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE public.google_oauth_nonces (
  nonce TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.google_oauth_nonces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_oauth_nonces FROM PUBLIC, anon, authenticated;

-- Profile email is sourced from auth.users, not user edits.
CREATE OR REPLACE FUNCTION public.lock_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.email := OLD.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_profile_email ON public.profiles;
CREATE TRIGGER lock_profile_email
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_profile_email();

CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email_from_auth();

CREATE OR REPLACE FUNCTION public.meeting_participant_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_host boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.scheduled_meetings
    WHERE id = OLD.meeting_id AND host_id = auth.uid()
  ) INTO is_host;

  IF is_host OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email
     OR NEW.meeting_id IS DISTINCT FROM OLD.meeting_id
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.reminder_sent IS DISTINCT FROM OLD.reminder_sent
     OR NEW.name IS DISTINCT FROM OLD.name THEN
    RAISE EXCEPTION 'invitees may only update RSVP status';
  END IF;

  IF NEW.status NOT IN ('pending', 'accepted', 'declined') THEN
    RAISE EXCEPTION 'invalid participant status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meeting_participant_update_guard ON public.meeting_participants;
CREATE TRIGGER meeting_participant_update_guard
  BEFORE UPDATE ON public.meeting_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.meeting_participant_update_guard();

CREATE OR REPLACE FUNCTION public.meeting_room_admit(p_room_id text, p_peer_id text, p_force boolean DEFAULT false)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_admitted text[];
BEGIN
  UPDATE public.meeting_rooms
  SET admitted = CASE
    WHEN p_peer_id = ANY (admitted) THEN admitted
    WHEN (NOT p_force) AND cardinality(admitted) >= 8 THEN admitted
    ELSE array_append(admitted, p_peer_id)
  END
  WHERE id = p_room_id
  RETURNING admitted INTO next_admitted;

  RETURN next_admitted;
END;
$$;

REVOKE ALL ON FUNCTION public.meeting_room_admit(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.meeting_room_admit(text, text, boolean) TO service_role;
