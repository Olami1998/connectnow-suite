import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Users, Shield, Zap, ArrowRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HeroProps {
  onCreateMeeting: (name: string, userName: string) => void;
  onJoinMeeting: (roomId: string) => void;
}

export function Hero({ onCreateMeeting, onJoinMeeting }: HeroProps) {
  const navigate = useNavigate();
  const [meetingName, setMeetingName] = useState('');
  const [userName, setUserName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');

  const handleCreate = () => {
    if (meetingName.trim() && userName.trim()) {
      onCreateMeeting(meetingName, userName);
    }
  };

  const handleJoin = () => {
    if (joinCode.trim()) {
      onJoinMeeting(joinCode);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px]" />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Content */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-20">
        {/* Badge */}
        <div className="mb-8 animate-fade-in rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
          <span className="flex items-center gap-2 text-sm font-medium text-primary">
            <Zap className="h-4 w-4" />
            Crystal-clear video conferencing
          </span>
        </div>

        {/* Heading */}
        <h1 className="mb-6 max-w-4xl animate-fade-in text-center text-5xl font-bold leading-tight md:text-7xl">
          Connect with{' '}
          <span className="text-gradient">anyone, anywhere</span>
        </h1>

        <p className="mb-12 max-w-2xl animate-fade-in text-center text-lg text-muted-foreground md:text-xl">
          Experience seamless video meetings with up to 8 participants. Screen
          sharing, chat, reactions, and more — all in one place.
        </p>

        {/* Features */}
        <div className="mb-12 flex animate-fade-in flex-wrap justify-center gap-6">
          {[
            { icon: Video, label: 'HD Video' },
            { icon: Users, label: 'Up to 8 people' },
            { icon: Shield, label: 'End-to-end encrypted' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Icon className="h-4 w-4 text-primary" />
              {label}
            </div>
          ))}
        </div>

        {/* Action Card */}
        <div className="glass-panel w-full max-w-md animate-scale-in p-6">
          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-secondary p-1">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                mode === 'create'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              New Meeting
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                mode === 'join'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Join Meeting
            </button>
          </div>

          {mode === 'create' ? (
            <div className="space-y-4">
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="bg-secondary/50"
              />
              <Input
                value={meetingName}
                onChange={(e) => setMeetingName(e.target.value)}
                placeholder="Meeting name (e.g., Team Standup)"
                className="bg-secondary/50"
              />
              <Button
                onClick={handleCreate}
                disabled={!meetingName.trim() || !userName.trim()}
                className="w-full gradient-primary"
              >
                Start Meeting
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter meeting code or link"
                className="bg-secondary/50 font-mono"
              />
              <Button
                onClick={handleJoin}
                disabled={!joinCode.trim()}
                className="w-full"
                variant="secondary"
              >
                Join Meeting
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Schedule link */}
        <div className="mt-8 animate-fade-in text-center">
          <Button variant="link" onClick={() => navigate('/schedule')}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule a meeting for later
          </Button>
        </div>
        
        <p className="mt-4 animate-fade-in text-center text-sm text-muted-foreground">
          No account required for guests. Just share the link and connect.
        </p>
      </div>
    </div>
  );
}
