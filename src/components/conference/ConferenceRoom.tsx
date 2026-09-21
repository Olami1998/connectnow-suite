import { useEffect, useRef, useState } from 'react';
import { VideoGrid } from './VideoGrid';
import { ControlBar } from './ControlBar';
import { ChatPanel } from './ChatPanel';
import { ParticipantsPanel } from './ParticipantsPanel';
import { SettingsModal } from './SettingsModal';
import { ReactionsOverlay } from './ReactionsOverlay';
import { MeetingHeader } from './MeetingHeader';
import { useRealtimeMeeting } from '@/hooks/useRealtimeMeeting';
import { VideoQuality } from '@/types/conference';
import { meetingInviteUrl } from '@/lib/meeting';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface MediaControls {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  audioDevices: { deviceId: string; label: string }[];
  videoDevices: { deviceId: string; label: string }[];
  selectedAudioDevice: string;
  selectedVideoDevice: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  selectAudioDevice: (deviceId: string) => Promise<void>;
  selectVideoDevice: (deviceId: string) => Promise<void>;
  setQuality: (quality: VideoQuality) => Promise<void>;
}

interface ConferenceRoomProps {
  roomId: string;
  roomName: string;
  userName: string;
  media: MediaControls;
  onLeave: () => void;
}

export function ConferenceRoom({
  roomId,
  roomName,
  userName,
  media,
  onLeave,
}: ConferenceRoomProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>('auto');
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [background, setBackground] = useState<'none' | 'blur'>('none');
  const [isRecording, setIsRecording] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const seenMuteEpoch = useRef<number | null>(null);

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
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    selectAudioDevice,
    selectVideoDevice,
    setQuality,
  } = media;

  const {
    selfId,
    participants,
    waitingRoom,
    messages,
    reactions,
    isHost,
    isAdmitted,
    kicked,
    roomFull,
    connectionError,
    allowChat,
    allowReactions,
    allowScreenShare,
    muteEpoch,
    sendMessage,
    sendReaction,
    admitParticipant,
    removeParticipant,
    muteAll,
    leaveRoom,
  } = useRealtimeMeeting({
    roomId,
    roomName,
    userName,
    localStream,
    screenStream,
    isMuted: !isAudioEnabled,
    isVideoOff: !isVideoEnabled,
    isScreenSharing,
    handRaised,
  });

  useEffect(() => {
    if (seenMuteEpoch.current === null) {
      seenMuteEpoch.current = muteEpoch;
      return;
    }
    if (muteEpoch > seenMuteEpoch.current && !isHost && isAudioEnabled) {
      toggleAudio();
    }
    seenMuteEpoch.current = muteEpoch;
  }, [isAudioEnabled, isHost, muteEpoch, toggleAudio]);

  const handleLeave = async () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    await leaveRoom();
    onLeave();
  };

  const handleToggleScreenShare = () => {
    if (!allowScreenShare && !isScreenSharing) return;
    if (isScreenSharing) stopScreenShare();
    else void startScreenShare();
  };

  const handleQualityChange = (quality: VideoQuality) => {
    setCurrentQuality(quality);
    void setQuality(quality);
  };

  const toggleRecording = () => {
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const stream = screenStream ?? localStream;
    if (!stream) return;

    try {
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${roomName.replace(/\s+/g, '-')}-local-recording.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Recording failed', error);
    }
  };

  if (kicked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Removed from meeting</AlertTitle>
          <AlertDescription>The host removed you. You cannot rejoin this room.</AlertDescription>
          <Button className="mt-4" onClick={onLeave}>Back home</Button>
        </Alert>
      </div>
    );
  }

  if (roomFull) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertTitle>Meeting is full</AlertTitle>
          <AlertDescription>
            This room already has 8 participants. Ask the host to remove someone, then try again.
          </AlertDescription>
          <Button className="mt-4" onClick={onLeave}>Back home</Button>
        </Alert>
      </div>
    );
  }

  if (connectionError && !isAdmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Cannot join</AlertTitle>
          <AlertDescription>{connectionError}</AlertDescription>
          <Button className="mt-4" onClick={onLeave}>Back home</Button>
        </Alert>
      </div>
    );
  }

  if (!isAdmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertTitle>Waiting for the host</AlertTitle>
          <AlertDescription>
            You are in the waiting room. The host will admit you shortly.
          </AlertDescription>
          <Button className="mt-4" variant="outline" onClick={handleLeave}>Leave</Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[hsl(var(--video-grid))]">
      <MeetingHeader
        roomName={roomName}
        roomId={roomId}
        isRecording={isRecording}
        inviteLink={meetingInviteUrl(roomId)}
      />

      {connectionError && (
        <div className="px-4 pt-2">
          <Alert variant="destructive">
            <AlertTitle>Connection issue</AlertTitle>
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        </div>
      )}

      {isRecording && (
        <p className="px-4 pt-2 text-center text-xs text-muted-foreground">
          Recording this device only (camera or shared screen), not other participants.
        </p>
      )}

      <div className="flex flex-1 overflow-hidden">
        <VideoGrid
          participants={participants}
          localStream={localStream}
          screenStream={screenStream}
          currentUserId={selfId}
          mirrorLocal={mirrorVideo}
          blurLocal={background === 'blur'}
        />

        {isChatOpen && allowChat && (
          <ChatPanel
            messages={messages}
            currentUserId={selfId}
            onSendMessage={sendMessage}
            onClose={() => setIsChatOpen(false)}
          />
        )}

        {isParticipantsOpen && (
          <ParticipantsPanel
            participants={participants}
            waitingRoom={waitingRoom}
            currentUserId={selfId}
            isHost={isHost}
            onClose={() => setIsParticipantsOpen(false)}
            onAdmit={admitParticipant}
            onRemove={removeParticipant}
            onMuteAll={isHost ? muteAll : undefined}
          />
        )}
      </div>

      <ControlBar
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isRecording={isRecording}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        isHandRaised={handRaised}
        isHost={isHost}
        participantCount={participants.length}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleRecording={toggleRecording}
        onToggleChat={() => allowChat && setIsChatOpen(!isChatOpen)}
        onToggleParticipants={() => setIsParticipantsOpen(!isParticipantsOpen)}
        onToggleHand={() => setHandRaised((v) => !v)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReaction={allowReactions ? sendReaction : () => undefined}
        onLeave={handleLeave}
      />

      <ReactionsOverlay reactions={reactions} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        selectedAudioDevice={selectedAudioDevice}
        selectedVideoDevice={selectedVideoDevice}
        currentQuality={currentQuality}
        mirrorVideo={mirrorVideo}
        hdVideo={currentQuality === 'high'}
        background={background}
        onSelectAudioDevice={(id) => void selectAudioDevice(id)}
        onSelectVideoDevice={(id) => void selectVideoDevice(id)}
        onSelectQuality={handleQualityChange}
        onMirrorChange={setMirrorVideo}
        onHdChange={(hd) => handleQualityChange(hd ? 'high' : 'medium')}
        onBackgroundChange={setBackground}
      />
    </div>
  );
}
