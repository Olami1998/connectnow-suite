import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, LogOut, ArrowLeft, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MeetingsCalendar } from '@/components/schedule/MeetingsCalendar';
import { ScheduleMeetingModal } from '@/components/schedule/ScheduleMeetingModal';
import { NotificationsDropdown } from '@/components/schedule/NotificationsDropdown';
import { UpcomingMeetings } from '@/components/schedule/UpcomingMeetings';
import { useAuth } from '@/hooks/useAuth';
import { useScheduledMeetings } from '@/hooks/useScheduledMeetings';
import { useNotifications } from '@/hooks/useNotifications';

export default function Schedule() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    meetings,
    loading: meetingsLoading,
    googleConnected,
    connectGoogleCalendar,
    createMeeting,
    deleteMeeting,
  } = useScheduledMeetings();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleJoinMeeting = (meetingLink: string) => {
    window.open(meetingLink, '_blank');
  };

  const handleSchedule = async (
    title: string,
    description: string,
    scheduledAt: Date,
    durationMinutes: number,
    participantEmails: string[],
    syncToGoogle: boolean
  ) => {
    await createMeeting(title, description, scheduledAt, durationMinutes, participantEmails, syncToGoogle);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || meetingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary">
                <Video className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">MeetFlow</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationsDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
            />
            
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Actions & Upcoming */}
          <div className="lg:w-80 space-y-6">
            <div className="glass-panel p-6">
              <h2 className="font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start"
                  onClick={() => setScheduleModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
                
                {!googleConnected && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={connectGoogleCalendar}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Connect Google Calendar
                  </Button>
                )}
                
                {googleConnected && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <svg viewBox="0 0 24 24" className="h-4 w-4">
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                    </svg>
                    Google Calendar connected
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Meetings
              </h2>
              <UpcomingMeetings
                meetings={meetings}
                onJoinMeeting={handleJoinMeeting}
              />
            </div>
          </div>

          {/* Right Column - Calendar */}
          <div className="flex-1">
            <MeetingsCalendar
              meetings={meetings}
              onDeleteMeeting={deleteMeeting}
              onJoinMeeting={handleJoinMeeting}
            />
          </div>
        </div>
      </main>

      <ScheduleMeetingModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        googleConnected={googleConnected}
        onSchedule={handleSchedule}
      />
    </div>
  );
}
