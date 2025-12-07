import { useState } from 'react';
import { Hero } from '@/components/landing/Hero';
import { WaitingRoom } from '@/components/conference/WaitingRoom';
import { ConferenceRoom } from '@/components/conference/ConferenceRoom';
import { useMediaDevices } from '@/hooks/useMediaDevices';

type AppState = 'landing' | 'waiting' | 'meeting';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('landing');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [guestName, setGuestName] = useState('');

  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    stopAllMedia,
  } = useMediaDevices();

  const handleCreateMeeting = (name: string, hostName: string) => {
    setRoomName(name);
    setUserName(hostName);
    setRoomId(Math.random().toString(36).substring(2, 10));
    setAppState('meeting');
  };

  const handleJoinMeeting = async (code: string) => {
    setRoomId(code);
    setRoomName('Meeting Room');
    await initializeMedia();
    setAppState('waiting');
  };

  const handleJoinFromWaiting = () => {
    setUserName(guestName);
    setAppState('meeting');
  };

  const handleLeaveMeeting = () => {
    stopAllMedia();
    setAppState('landing');
    setRoomId('');
    setRoomName('');
    setUserName('');
    setGuestName('');
  };

  if (appState === 'waiting') {
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

  if (appState === 'meeting') {
    return (
      <ConferenceRoom
        roomId={roomId}
        roomName={roomName}
        userName={userName}
        onLeave={handleLeaveMeeting}
      />
    );
  }

  return (
    <Hero
      onCreateMeeting={handleCreateMeeting}
      onJoinMeeting={handleJoinMeeting}
    />
  );
};

export default Index;
