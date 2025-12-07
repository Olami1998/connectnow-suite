import { X, Mic, MicOff, Video, VideoOff, Crown, MoreVertical, UserMinus } from 'lucide-react';
import { Participant } from '@/types/conference';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ParticipantsPanelProps {
  participants: Participant[];
  waitingRoom: Participant[];
  currentUserId: string;
  isHost: boolean;
  onClose: () => void;
  onAdmit: (participantId: string) => void;
  onRemove: (participantId: string) => void;
}

export function ParticipantsPanel({
  participants,
  waitingRoom,
  currentUserId,
  isHost,
  onClose,
  onAdmit,
  onRemove,
}: ParticipantsPanelProps) {
  return (
    <div className="glass-panel flex h-full w-80 flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-semibold">
          Participants ({participants.length})
        </h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 transition-colors hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        {/* Waiting Room */}
        {isHost && waitingRoom.length > 0 && (
          <div className="border-b border-border p-4">
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              Waiting Room ({waitingRoom.length})
            </h4>
            <div className="space-y-2">
              {waitingRoom.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between rounded-lg bg-warning/10 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/20 text-sm font-medium text-warning">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">
                      {participant.name}
                    </span>
                  </div>
                  <button
                    onClick={() => onAdmit(participant.id)}
                    className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-success-foreground transition-colors hover:bg-success/90"
                  >
                    Admit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participants List */}
        <div className="p-4">
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">
            In Meeting
          </h4>
          <div className="space-y-2">
            {participants.map((participant) => {
              const isSelf = participant.id === currentUserId;

              return (
                <div
                  key={participant.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg p-3 transition-colors',
                    participant.isSpeaking
                      ? 'bg-primary/10 ring-1 ring-primary/30'
                      : 'hover:bg-secondary/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                        participant.isHost
                          ? 'bg-primary/20 text-primary'
                          : 'bg-secondary text-foreground'
                      )}
                    >
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {participant.name}
                        {isSelf && (
                          <span className="text-xs text-muted-foreground">
                            (You)
                          </span>
                        )}
                        {participant.isHost && (
                          <Crown className="h-3 w-3 text-primary" />
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {participant.isMuted ? (
                      <MicOff className="h-4 w-4 text-destructive" />
                    ) : (
                      <Mic className="h-4 w-4 text-muted-foreground" />
                    )}
                    {participant.isVideoOff ? (
                      <VideoOff className="h-4 w-4 text-destructive" />
                    ) : (
                      <Video className="h-4 w-4 text-muted-foreground" />
                    )}

                    {isHost && !isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-lg p-1 transition-colors hover:bg-secondary">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onRemove(participant.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove from meeting
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
