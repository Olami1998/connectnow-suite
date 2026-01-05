-- Add email validation CHECK constraint to meeting_participants table
ALTER TABLE public.meeting_participants 
ADD CONSTRAINT meeting_participants_email_valid 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');