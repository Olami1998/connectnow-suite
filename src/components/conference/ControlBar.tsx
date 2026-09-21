import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Users,
  Settings,
  PhoneOff,
  Circle,
  Hand,
  Smile,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { REACTION_EMOJIS } from '@/types/conference';
import { cn } from '@/lib/utils';

interface ControlBarProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  participantCount: number;
  isHandRaised?: boolean;
  isHost?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onToggleHand?: () => void;
  onOpenSettings: () => void;
  onReaction: (emoji: string) => void;
  onLeave: () => void;
}

export function ControlBar({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isRecording,
  isChatOpen,
  isParticipantsOpen,
  participantCount,
  isHandRaised = false,
  isHost = false,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onToggleChat,
  onToggleParticipants,
  onToggleHand,
  onOpenSettings,
  onReaction,
  onLeave,
}: ControlBarProps) {
  return (
    <div className="glass-panel mx-auto mb-4 flex max-w-full flex-wrap items-center justify-center gap-2 px-4 py-3">
      {/* Primary controls */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              onClick={onToggleAudio}
              className={cn(
                'control-button',
                !isAudioEnabled && 'control-button-danger'
              )}
            >
              {isAudioEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isAudioEnabled ? 'Mute' : 'Unmute'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
              onClick={onToggleVideo}
              className={cn(
                'control-button',
                !isVideoEnabled && 'control-button-danger'
              )}
            >
              {isVideoEnabled ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isVideoEnabled ? 'Stop Video' : 'Start Video'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
              onClick={onToggleScreenShare}
              className={cn(
                'control-button',
                isScreenSharing && 'control-button-active'
              )}
            >
              {isScreenSharing ? (
                <MonitorOff className="h-5 w-5" />
              ) : (
                <Monitor className="h-5 w-5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="mx-2 h-8 w-px bg-border" />

      {/* Secondary controls */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Participants"
              onClick={onToggleParticipants}
              className={cn(
                'control-button relative',
                isParticipantsOpen && 'control-button-active'
              )}
            >
              <Users className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {participantCount}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Participants</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Chat"
              onClick={onToggleChat}
              className={cn(
                'control-button',
                isChatOpen && 'control-button-active'
              )}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Chat</TooltipContent>
        </Tooltip>

        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="control-button" aria-label="Send a reaction">
              <Smile className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <div className="flex gap-1">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onReaction(emoji)}
                  className="rounded-lg p-2 text-xl transition-transform hover:scale-125 hover:bg-secondary"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {onToggleHand && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={isHandRaised ? 'Lower hand' : 'Raise hand'}
                onClick={onToggleHand}
                className={cn('control-button', isHandRaised && 'control-button-active')}
              >
                <Hand className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{isHandRaised ? 'Lower hand' : 'Raise hand'}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              onClick={onToggleRecording}
              className={cn(
                'control-button',
                isRecording && 'control-button-danger animate-pulse-ring'
              )}
            >
              <Circle
                className={cn('h-5 w-5', isRecording && 'fill-current')}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isRecording ? 'Stop recording this device' : 'Record this device only'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Meeting settings" onClick={onOpenSettings} className="control-button">
              <Settings className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </div>

      <div className="mx-2 h-8 w-px bg-border" />

      {/* Leave button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Leave meeting"
            onClick={onLeave}
            className="control-button control-button-danger"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Leave Meeting</TooltipContent>
      </Tooltip>
    </div>
  );
}
