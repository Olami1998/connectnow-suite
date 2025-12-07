import { useState } from 'react';
import { Copy, Check, Shield, Circle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MeetingHeaderProps {
  roomName: string;
  roomId: string;
  isRecording: boolean;
  startTime?: Date;
  inviteLink: string;
}

export function MeetingHeader({
  roomName,
  roomId,
  isRecording,
  startTime,
  inviteLink,
}: MeetingHeaderProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Share this link with others to join the meeting.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="glass-panel mx-4 mt-4 flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-semibold">{roomName}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{roomId}</span>
            {startTime && (
              <>
                <span>•</span>
                <Clock className="h-3 w-3" />
                <span>{format(startTime, 'HH:mm')}</span>
              </>
            )}
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 rounded-full bg-destructive/20 px-3 py-1 text-sm text-destructive">
            <Circle className="h-2 w-2 animate-pulse fill-current" />
            Recording
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-success/20 px-2 py-1 text-xs text-success">
          <Shield className="h-3 w-3" />
          Encrypted
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={copyInviteLink}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Invite
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
