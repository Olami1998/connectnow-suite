import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Trash2, ExternalLink, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScheduledMeeting } from '@/hooks/useScheduledMeetings';
import { cn } from '@/lib/utils';

interface MeetingsCalendarProps {
  meetings: ScheduledMeeting[];
  onDeleteMeeting: (meetingId: string) => void;
  onJoinMeeting: (meetingLink: string) => void;
}

export function MeetingsCalendar({ meetings, onDeleteMeeting, onJoinMeeting }: MeetingsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, ScheduledMeeting[]>();
    meetings.forEach((meeting) => {
      const dateKey = format(new Date(meeting.scheduled_at), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(meeting);
    });
    return map;
  }, [meetings]);

  const selectedMeetings = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return meetingsByDate.get(dateKey) || [];
  }, [selectedDate, meetingsByDate]);

  const startDayOffset = useMemo(() => {
    return startOfMonth(currentMonth).getDay();
  }, [currentMonth]);

  return (
    <div className="glass-panel p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: startDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayMeetings = meetingsByDate.get(dateKey) || [];
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(day)}
              className={cn(
                'aspect-square p-1 rounded-lg transition-colors relative',
                'hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
                isToday(day) && 'ring-2 ring-primary',
                isSelected && 'bg-primary text-primary-foreground',
                isPast && 'text-muted-foreground',
                !isSameMonth(day, currentMonth) && 'opacity-50'
              )}
            >
              <span className="text-sm">{format(day, 'd')}</span>
              {dayMeetings.length > 0 && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayMeetings.slice(0, 3).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isSelected ? 'bg-primary-foreground' : 'bg-primary'
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Meetings */}
      {selectedDate && (
        <div className="mt-6 border-t pt-6">
          <h3 className="font-medium mb-4">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h3>
          {selectedMeetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meetings scheduled</p>
          ) : (
            <div className="space-y-3">
              {selectedMeetings.map((meeting) => {
                const meetingTime = new Date(meeting.scheduled_at);
                const isPast = meetingTime < new Date();

                return (
                  <div
                    key={meeting.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      isPast ? 'opacity-60' : 'bg-secondary/30'
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{meeting.title}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {format(meetingTime, 'h:mm a')} • {meeting.duration_minutes} min
                        </p>
                        {meeting.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {meeting.description}
                          </p>
                        )}
                        {meeting.google_calendar_event_id && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-2">
                            <svg viewBox="0 0 24 24" className="h-3 w-3">
                              <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                            </svg>
                            Synced to Google Calendar
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {!isPast && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onJoinMeeting(meeting.meeting_link)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDeleteMeeting(meeting.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
