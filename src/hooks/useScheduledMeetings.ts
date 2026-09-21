import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { meetingInviteUrl, saveHostToken } from '@/lib/meeting';
import { useToast } from '@/hooks/use-toast';

export interface ScheduledMeeting {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  meeting_link: string;
  scheduled_at: string;
  duration_minutes: number;
  google_calendar_event_id: string | null;
  created_at: string;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  email: string;
  name: string | null;
  status: 'pending' | 'accepted' | 'declined';
}

export function useScheduledMeetings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);

  const fetchMeetings = useCallback(async () => {
    if (!user) {
      setMeetings([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('scheduled_meetings')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const checkGoogleConnection = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'check-connection' },
      });

      if (!error && data?.connected) {
        setGoogleConnected(true);
      } else {
        setGoogleConnected(false);
      }
    } catch (error) {
      console.error('Error checking Google connection:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchMeetings();
    checkGoogleConnection();
  }, [fetchMeetings, checkGoogleConnection]);

  const connectGoogleCalendar = useCallback(async () => {
    if (!user) return;

    try {
      const redirectUri = `${window.location.origin}/calendar-callback`;
      
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get-auth-url', redirectUri },
      });

      if (error) throw error;
      
      // Store redirect URI for callback
      localStorage.setItem('google_calendar_redirect', redirectUri);
      sessionStorage.setItem('google_oauth_state', data.state);
      
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect Google Calendar',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  const createMeeting = useCallback(async (
    title: string,
    description: string,
    scheduledAt: Date,
    durationMinutes: number,
    participantEmails: string[],
    syncToGoogle: boolean
  ) => {
    if (!user) return null;

    try {
      const { data: room, error: roomError } = await supabase.functions.invoke('meeting-room', {
        body: { action: 'create', name: title },
      });
      if (roomError || room?.error || !room?.roomId) {
        throw new Error(room?.error || 'Could not create a meeting room');
      }
      if (room.hostToken) saveHostToken(room.roomId, room.hostToken);
      const meetingLink = meetingInviteUrl(room.roomId);

      const { data: meeting, error } = await supabase
        .from('scheduled_meetings')
        .insert({
          host_id: user.id,
          title,
          description,
          meeting_link: meetingLink,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: durationMinutes,
        })
        .select()
        .single();

      if (error) throw error;

      // Add participants
      if (participantEmails.length > 0) {
        const participants = participantEmails.map((email) => ({
          meeting_id: meeting.id,
          email,
        }));

        const { error: participantError } = await supabase.from('meeting_participants').insert(participants);
        if (participantError) throw participantError;

        const { data: inviteData, error: inviteError } = await supabase.functions.invoke('send-invite', {
          body: {
            meetingId: meeting.id,
            title,
            description,
            scheduledAt: scheduledAt.toISOString(),
            durationMinutes,
            emails: participantEmails.slice(0, 20),
          },
        });
        if (inviteError || inviteData?.error) {
          toast({
            title: 'Meeting saved, invites failed',
            description: inviteError?.message || inviteData?.error || 'Send invites again later',
            variant: 'destructive',
          });
        }
      }

      // Sync to Google Calendar if connected
      if (syncToGoogle && googleConnected) {
        const endTime = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
        
        const { data: calendarData, error: calendarError } = await supabase.functions.invoke('google-calendar', {
          body: {
            action: 'create-event',
            meetingId: meeting.id,
            title,
            description: `${description || ''}\n\nJoin meeting: ${meetingLink}`,
            startTime: scheduledAt.toISOString(),
            endTime: endTime.toISOString(),
            attendees: participantEmails,
          },
        });

        if (calendarError) {
          console.error('Error syncing to Google Calendar:', calendarError);
        } else {
          toast({
            title: 'Added to Google Calendar',
            description: 'Meeting synced to your Google Calendar',
          });
        }
      }

      await fetchMeetings();
      
      toast({
        title: 'Meeting scheduled',
        description: `"${title}" scheduled for ${scheduledAt.toLocaleString()}`,
      });

      return meeting;
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule meeting',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, googleConnected, fetchMeetings, toast]);

  const deleteMeeting = useCallback(async (meetingId: string) => {
    if (!user) return;

    try {
      const meeting = meetings.find((m) => m.id === meetingId);

      // Delete from Google Calendar if synced
      if (meeting?.google_calendar_event_id && googleConnected) {
        await supabase.functions.invoke('google-calendar', {
          body: {
            action: 'delete-event',
            eventId: meeting.google_calendar_event_id,
          },
        });
      }

      const { error } = await supabase
        .from('scheduled_meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;

      await fetchMeetings();
      
      toast({
        title: 'Meeting deleted',
        description: 'The scheduled meeting has been removed',
      });
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete meeting',
        variant: 'destructive',
      });
    }
  }, [user, meetings, googleConnected, fetchMeetings, toast]);

  const updateMeeting = useCallback(async (
    meetingId: string,
    title: string,
    description: string,
    scheduledAt: Date,
    durationMinutes: number,
  ) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('scheduled_meetings')
        .update({
          title,
          description,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', meetingId)
        .eq('host_id', user.id);

      if (error) throw error;

      const meeting = meetings.find((m) => m.id === meetingId);
      if (meeting?.google_calendar_event_id && googleConnected) {
        const endTime = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
        await supabase.functions.invoke('google-calendar', {
          body: {
            action: 'update-event',
            eventId: meeting.google_calendar_event_id,
            title,
            description,
            startTime: scheduledAt.toISOString(),
            endTime: endTime.toISOString(),
          },
        });
      }

      await fetchMeetings();
      toast({ title: 'Meeting updated', description: `"${title}" was rescheduled.` });
      return true;
    } catch (error) {
      console.error('Error updating meeting:', error);
      toast({ title: 'Error', description: 'Failed to update meeting', variant: 'destructive' });
      return false;
    }
  }, [user, meetings, googleConnected, fetchMeetings, toast]);

  const disconnectGoogleCalendar = useCallback(async () => {
    try {
      await supabase.functions.invoke('google-calendar', { body: { action: 'disconnect' } });
      setGoogleConnected(false);
      toast({ title: 'Google Calendar disconnected' });
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
    }
  }, [toast]);

  return {
    meetings,
    loading,
    googleConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    refetch: fetchMeetings,
  };
}
