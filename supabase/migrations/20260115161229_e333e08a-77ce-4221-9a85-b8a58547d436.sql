-- Fix: Remove SELECT access for google_tokens (OAuth tokens should only be accessible server-side)
-- Drop the existing ALL policy and create specific policies without SELECT

DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.google_tokens;

-- Allow INSERT for initial token storage (from edge function with service role)
CREATE POLICY "Users can insert their own tokens" ON public.google_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow UPDATE for token refresh (from edge function with service role)
CREATE POLICY "Users can update their own tokens" ON public.google_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow DELETE for disconnection
CREATE POLICY "Users can delete their own tokens" ON public.google_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- NO SELECT POLICY - tokens should only be accessible via Edge Functions with service role key