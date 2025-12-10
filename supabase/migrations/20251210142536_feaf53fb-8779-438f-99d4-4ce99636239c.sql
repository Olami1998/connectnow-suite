-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create scheduled meetings table
CREATE TABLE public.scheduled_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  meeting_link TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  google_calendar_event_id TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on scheduled_meetings
ALTER TABLE public.scheduled_meetings ENABLE ROW LEVEL SECURITY;

-- Meeting policies
CREATE POLICY "Users can view their own meetings" ON public.scheduled_meetings
  FOR SELECT USING (auth.uid() = host_id);

CREATE POLICY "Users can create their own meetings" ON public.scheduled_meetings
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can update their own meetings" ON public.scheduled_meetings
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Users can delete their own meetings" ON public.scheduled_meetings
  FOR DELETE USING (auth.uid() = host_id);

-- Meeting participants/invitees
CREATE TABLE public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.scheduled_meetings(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on meeting_participants
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- Participants policies (host can manage)
CREATE POLICY "Users can view participants of their meetings" ON public.meeting_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.scheduled_meetings WHERE id = meeting_id AND host_id = auth.uid())
  );

CREATE POLICY "Users can add participants to their meetings" ON public.meeting_participants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.scheduled_meetings WHERE id = meeting_id AND host_id = auth.uid())
  );

CREATE POLICY "Users can update participants of their meetings" ON public.meeting_participants
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.scheduled_meetings WHERE id = meeting_id AND host_id = auth.uid())
  );

CREATE POLICY "Users can delete participants from their meetings" ON public.meeting_participants
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.scheduled_meetings WHERE id = meeting_id AND host_id = auth.uid())
  );

-- In-app notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'reminder' CHECK (type IN ('reminder', 'invite', 'system')),
  meeting_id UUID REFERENCES public.scheduled_meetings(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notification policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Store Google OAuth tokens
CREATE TABLE public.google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on google_tokens
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- Google tokens policies
CREATE POLICY "Users can manage their own tokens" ON public.google_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_meetings_updated_at
  BEFORE UPDATE ON public.scheduled_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_tokens_updated_at
  BEFORE UPDATE ON public.google_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();