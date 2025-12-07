import { useState } from 'react';
import { Participant } from '@/types/conference';
import { VideoTile } from './VideoTile';
import { cn } from '@/lib/utils';

interface VideoGridProps {
  participants: Participant[];
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  currentUserId: string;
}

export function VideoGrid({
  participants,
  localStream,
  screenStream,
  currentUserId,
}: VideoGridProps) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const getGridClass = (count: number) => {
    if (pinnedId) return 'grid-cols-4';
    if (count === 1) return 'grid-cols-1 max-w-2xl mx-auto';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.id === pinnedId) return -1;
    if (b.id === pinnedId) return 1;
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    if (a.isHost) return -1;
    if (b.isHost) return 1;
    return 0;
  });

  const totalTiles = screenStream ? participants.length + 1 : participants.length;

  return (
    <div className="flex-1 overflow-hidden p-4">
      <div
        className={cn(
          'grid h-full gap-3 auto-rows-fr',
          getGridClass(totalTiles)
        )}
      >
        {/* Screen share tile */}
        {screenStream && (
          <div
            className={cn(
              'video-tile col-span-2 row-span-2',
              pinnedId === 'screen' && 'col-span-3 row-span-2'
            )}
          >
            <video
              autoPlay
              playsInline
              ref={(el) => {
                if (el) el.srcObject = screenStream;
              }}
              className="absolute inset-0 h-full w-full object-contain bg-background"
            />
            <div className="video-tile-name">
              <span>Screen Share</span>
            </div>
          </div>
        )}

        {/* Participant tiles */}
        {sortedParticipants.map((participant) => {
          const isLocal = participant.id === currentUserId;
          const isPinned = pinnedId === participant.id;

          return (
            <VideoTile
              key={participant.id}
              participant={participant}
              stream={isLocal ? localStream : participant.stream}
              isLocal={isLocal}
              isPinned={isPinned}
              onPin={() => setPinnedId(isPinned ? null : participant.id)}
              size={
                isPinned
                  ? 'large'
                  : totalTiles <= 2
                  ? 'large'
                  : totalTiles <= 4
                  ? 'medium'
                  : 'small'
              }
            />
          );
        })}
      </div>
    </div>
  );
}
