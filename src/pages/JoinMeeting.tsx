import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WaitingRoom } from '@/components/conference/WaitingRoom';
import { ConferenceRoom } from '@/components/conference/ConferenceRoom';
import { useMediaDevices } from '@/hooks/useMediaDevices';
import { Loader2 } from 'lucide-react';

type JoinState = 'loading' | 'waiting' | 'meeting';

const JoinMeeting = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [joinState, setJoinState] = useState<JoinState>('loading');
  const [guestName, setGuestName] = useState('');
  const [roomName] = useState('Meeting Room');

  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    stopAllMedia,
  } = useMediaDevices();

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    const init = async () => {
      await initializeMedia();
      setJoinState('waiting');
    };

    init();
  }, [roomId, navigate, initializeMedia]);

  const handleJoinFromWaiting = () => {
    if (guestName.trim()) {
      setJoinState('meeting');
    }
  };

  const handleLeaveMeeting = () => {
    stopAllMedia();
    navigate('/');
  };

  if (joinState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Preparing to join meeting...</p>
        </div>
      </div>
    );
  }

  if (joinState === 'waiting') {
    return (
      <WaitingRoom
        roomName={roomName}
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
      roomName={roomName}
      userName={guestName}
      onLeave={handleLeaveMeeting}
    />
  );
};

export default JoinMeeting;
