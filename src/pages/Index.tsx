import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Hero } from '@/components/landing/Hero';
import { meetingJoinPath, parseMeetingInput, saveHostToken } from '@/lib/meeting';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const legacyRoom = searchParams.get('room');
    if (legacyRoom) {
      const id = parseMeetingInput(legacyRoom);
      if (id) navigate(meetingJoinPath(id), { replace: true });
    }
  }, [navigate, searchParams]);

  const handleCreateMeeting = async (name: string, hostName: string) => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('meeting-room', {
        body: { action: 'create', name },
      });
      if (error || data?.error || !data?.roomId || !data?.hostToken) {
        throw new Error(data?.error || error?.message || 'Could not create room');
      }
      saveHostToken(data.roomId, data.hostToken);
      const params = new URLSearchParams({
        name: hostName.slice(0, 80),
        title: name.slice(0, 80),
      });
      navigate(`${meetingJoinPath(data.roomId)}?${params.toString()}`);
    } catch (err) {
      toast({
        title: 'Could not start meeting',
        description: err instanceof Error ? err.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinMeeting = (code: string) => {
    const roomId = parseMeetingInput(code);
    if (!roomId) {
      toast({
        title: 'Invalid meeting code',
        description: 'Paste a MeetFlow join link or an 8–64 character room code.',
        variant: 'destructive',
      });
      return;
    }
    navigate(meetingJoinPath(roomId));
  };

  return (
    <Hero
      onCreateMeeting={handleCreateMeeting}
      onJoinMeeting={handleJoinMeeting}
      creating={creating}
    />
  );
};

export default Index;
