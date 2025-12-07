import { useEffect, useRef } from 'react';
import { Loader2, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WaitingRoomProps {
  roomName: string;
  guestName: string;
  localStream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onNameChange: (name: string) => void;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onJoin: () => void;
  isJoining?: boolean;
}

export function WaitingRoom({
  roomName,
  guestName,
  localStream,
  isVideoEnabled,
  isAudioEnabled,
  onNameChange,
  onToggleVideo,
  onToggleAudio,
  onJoin,
  isJoining = false,
}: WaitingRoomProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--video-grid))] p-4">
      <div className="waiting-room-card animate-scale-in">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Join Meeting</h1>
          <p className="mt-1 text-muted-foreground">{roomName}</p>
        </div>

        {/* Video Preview */}
        <div className="relative aspect-video overflow-hidden rounded-xl bg-secondary">
          {localStream && isVideoEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-3xl font-semibold">
                {guestName ? guestName.charAt(0).toUpperCase() : '?'}
              </div>
            </div>
          )}

          {/* Control buttons */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            <button
              onClick={onToggleAudio}
              className={`control-button ${!isAudioEnabled ? 'control-button-danger' : ''}`}
            >
              {isAudioEnabled ? (
                <Mic className="h-4 w-4" />
              ) : (
                <MicOff className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={onToggleVideo}
              className={`control-button ${!isVideoEnabled ? 'control-button-danger' : ''}`}
            >
              {isVideoEnabled ? (
                <Video className="h-4 w-4" />
              ) : (
                <VideoOff className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Name Input */}
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={guestName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter your name"
            className="bg-secondary/50"
          />
        </div>

        {/* Join Button */}
        <Button
          onClick={onJoin}
          disabled={!guestName.trim() || isJoining}
          className="w-full gradient-primary"
        >
          {isJoining ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining...
            </>
          ) : (
            'Join Meeting'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By joining, you agree to our terms of service
        </p>
      </div>
    </div>
  );
}
