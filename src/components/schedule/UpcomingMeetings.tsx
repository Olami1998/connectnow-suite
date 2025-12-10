import { format, isToday, isTomorrow, differenceInMinutes } from 'date-fns';
import { Clock, ExternalLink, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScheduledMeeting } from '@/hooks/useScheduledMeetings';
import { cn } from '@/lib/utils';

interface UpcomingMeetingsProps {
  meetings: ScheduledMeeting[];
  onJoinMeeting: (meetingLink: string) => void;
}

export function UpcomingMeetings({ meetings, onJoinMeeting }: UpcomingMeetingsProps) {
  const now = new Date();
  const upcomingMeetings = meetings
    .filter((m) => new Date(m.scheduled_at) > now)
    .slice(0, 5);

  if (upcomingMeetings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No upcoming meetings</p>
        <p className="text-xs mt-1">Schedule a meeting to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {upcomingMeetings.map((meeting) => {
        const meetingTime = new Date(meeting.scheduled_at);
        const minutesUntil = differenceInMinutes(meetingTime, now);
        const isStartingSoon = minutesUntil <= 15 && minutesUntil > 0;

        let dateLabel = format(meetingTime, 'MMM d');
        if (isToday(meetingTime)) dateLabel = 'Today';
        else if (isTomorrow(meetingTime)) dateLabel = 'Tomorrow';

        return (
          <div
            key={meeting.id}
            className={cn(
              'p-4 rounded-lg border transition-colors',
              isStartingSoon && 'border-primary bg-primary/5 animate-pulse-ring'
            )}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{meeting.title}</h4>
                  {isStartingSoon && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Starting soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {dateLabel} at {format(meetingTime, 'h:mm a')}
                </p>
              </div>
              <Button
                variant={isStartingSoon ? 'default' : 'outline'}
                size="sm"
                onClick={() => onJoinMeeting(meeting.meeting_link)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Join
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
