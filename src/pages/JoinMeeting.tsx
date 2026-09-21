import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { WaitingRoom } from '@/components/conference/WaitingRoom';
import { ConferenceRoom } from '@/components/conference/ConferenceRoom';
import { useMediaDevices } from '@/hooks/useMediaDevices';
import { parseMeetingInput } from '@/lib/meeting';
import { Loader2 } from 'lucide-react';

type JoinState = 'loading' | 'waiting' | 'meeting' | 'invalid';

const JoinMeeting = () => {
  const { roomId: rawRoomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = rawRoomId ? parseMeetingInput(rawRoomId) : null;
  const title = (searchParams.get('title') || 'Meeting Room').slice(0, 80);
  const presetName = (searchParams.get('name') || '').slice(0, 80);

  const [joinState, setJoinState] = useState<JoinState>('loading');
  const [guestName, setGuestName] = useState(presetName);

  const media = useMediaDevices();
  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    stopAllMedia,
  } = media;

  useEffect(() => {
    if (!roomId) {
      setJoinState('invalid');
      return;
    }

    const init = async () => {
      await initializeMedia();
      setJoinState('waiting');
    };

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleJoinFromWaiting = () => {
    if (guestName.trim()) setJoinState('meeting');
  };

  const handleLeaveMeeting = () => {
    stopAllMedia();
    navigate('/');
  };

  if (joinState === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">That meeting link is invalid.</p>
      </div>
    );
  }

  if (joinState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-muted-foreground">Preparing to join meeting...</p>
        </div>
      </div>
    );
  }

  if (joinState === 'waiting') {
    return (
      <WaitingRoom
        roomName={title}
        guestName={guestName}
        localStream={localStream}
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        onNameChange={setGuestName}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onJoin={handleJoinFromWaiting}
      />
    );
  }

  return (
    <ConferenceRoom
      roomId={roomId!}
      roomName={title}
      userName={guestName.trim()}
      media={media}
      onLeave={handleLeaveMeeting}
    />
  );
};

export default JoinMeeting;
