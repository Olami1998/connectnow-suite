import { useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, Pin } from 'lucide-react';
import { Participant } from '@/types/conference';
import { cn } from '@/lib/utils';

interface VideoTileProps {
  participant: Participant;
  stream?: MediaStream | null;
  isLocal?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function VideoTile({
  participant,
  stream,
  isLocal = false,
  isPinned = false,
  onPin,
  size = 'medium',
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const sizeClasses = {
    small: 'aspect-video min-h-[120px]',
    medium: 'aspect-video min-h-[200px]',
    large: 'aspect-video min-h-[400px]',
  };

  return (
    <div
      className={cn(
        'video-tile group relative',
        sizeClasses[size],
        participant.isSpeaking && 'video-tile-speaking',
        isPinned && 'col-span-2 row-span-2'
      )}
    >
      {/* Video or Avatar */}
      {participant.isVideoOff || !stream ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-3xl font-semibold text-primary">
            {participant.name.charAt(0).toUpperCase()}
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Name badge */}
      <div className="video-tile-name flex items-center gap-2">
        {participant.isMuted && <MicOff className="h-3 w-3 text-destructive" />}
        <span>{isLocal ? `${participant.name} (You)` : participant.name}</span>
        {participant.isHost && (
          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">Host</span>
        )}
      </div>

      {/* Status indicators */}
      <div className="absolute right-3 top-3 flex gap-2">
        {participant.isVideoOff && (
          <div className="rounded-full bg-destructive/20 p-1.5">
            <VideoOff className="h-3 w-3 text-destructive" />
          </div>
        )}
        {participant.isScreenSharing && (
          <div className="rounded-full bg-primary/20 p-1.5">
            <span className="text-xs text-primary">Screen</span>
          </div>
        )}
      </div>

      {/* Pin button */}
      {onPin && (
        <button
          onClick={onPin}
          className={cn(
            'absolute right-3 top-12 rounded-full p-2 opacity-0 transition-all',
            'bg-secondary/80 hover:bg-secondary group-hover:opacity-100',
            isPinned && 'bg-primary text-primary-foreground opacity-100'
          )}
        >
          <Pin className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
