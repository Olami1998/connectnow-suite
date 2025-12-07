import { useState, useEffect } from 'react';
import { VideoGrid } from './VideoGrid';
import { ControlBar } from './ControlBar';
import { ChatPanel } from './ChatPanel';
import { ParticipantsPanel } from './ParticipantsPanel';
import { SettingsModal } from './SettingsModal';
import { ReactionsOverlay } from './ReactionsOverlay';
import { MeetingHeader } from './MeetingHeader';
import { useMediaDevices } from '@/hooks/useMediaDevices';
import { useConference } from '@/hooks/useConference';
import { VideoQuality } from '@/types/conference';

interface ConferenceRoomProps {
  roomId: string;
  roomName: string;
  userName: string;
  onLeave: () => void;
}

export function ConferenceRoom({
  roomId,
  roomName,
  userName,
  onLeave,
}: ConferenceRoomProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>('auto');

  const {
    localStream,
    screenStream,
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    selectAudioDevice,
    selectVideoDevice,
    setQuality,
    stopAllMedia,
  } = useMediaDevices();

  const {
    room,
    participants,
    waitingRoom,
    messages,
    reactions,
    isRecording,
    isHost,
    createRoom,
    sendMessage,
    sendReaction,
    toggleRecording,
    admitParticipant,
    removeParticipant,
    generateInviteLink,
    leaveRoom,
  } = useConference();

  useEffect(() => {
    initializeMedia();
    createRoom(roomName, userName);

    return () => {
      stopAllMedia();
      leaveRoom();
    };
  }, []);

  const handleLeave = () => {
    stopAllMedia();
    leaveRoom();
    onLeave();
  };

  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleQualityChange = (quality: VideoQuality) => {
    setCurrentQuality(quality);
    setQuality(quality);
  };

  // Update local participant state
  useEffect(() => {
    // This would sync with WebRTC in a real implementation
  }, [isAudioEnabled, isVideoEnabled, isScreenSharing]);

  return (
    <div className="flex h-screen flex-col bg-[hsl(var(--video-grid))]">
      {/* Header */}
      <MeetingHeader
        roomName={roomName}
        roomId={roomId}
        isRecording={isRecording}
        startTime={room?.startTime}
        inviteLink={generateInviteLink()}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Grid */}
        <VideoGrid
          participants={participants}
          localStream={localStream}
          screenStream={screenStream}
          currentUserId={participants[0]?.id || ''}
        />

        {/* Side Panels */}
        {isChatOpen && (
          <ChatPanel
            messages={messages}
            currentUserId={participants[0]?.id || ''}
            onSendMessage={sendMessage}
            onClose={() => setIsChatOpen(false)}
          />
        )}

        {isParticipantsOpen && (
          <ParticipantsPanel
            participants={participants}
            waitingRoom={waitingRoom}
            currentUserId={participants[0]?.id || ''}
            isHost={isHost}
            onClose={() => setIsParticipantsOpen(false)}
            onAdmit={admitParticipant}
            onRemove={removeParticipant}
          />
        )}
      </div>

      {/* Control Bar */}
      <ControlBar
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isRecording={isRecording}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        participantCount={participants.length}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleRecording={toggleRecording}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onToggleParticipants={() => setIsParticipantsOpen(!isParticipantsOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReaction={sendReaction}
        onLeave={handleLeave}
      />

      {/* Reactions Overlay */}
      <ReactionsOverlay reactions={reactions} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        selectedAudioDevice={selectedAudioDevice}
        selectedVideoDevice={selectedVideoDevice}
        currentQuality={currentQuality}
        onSelectAudioDevice={selectAudioDevice}
        onSelectVideoDevice={selectVideoDevice}
        onSelectQuality={handleQualityChange}
      />
    </div>
  );
}
