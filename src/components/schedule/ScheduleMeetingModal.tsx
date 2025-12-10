import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Users, X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ScheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  googleConnected: boolean;
  onSchedule: (
    title: string,
    description: string,
    scheduledAt: Date,
    durationMinutes: number,
    participantEmails: string[],
    syncToGoogle: boolean
  ) => Promise<void>;
}

const DURATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
];

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  return {
    value: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    label: format(new Date().setHours(hours, minutes), 'h:mm a'),
  };
});

export function ScheduleMeetingModal({
  open,
  onOpenChange,
  googleConnected,
  onSchedule,
}: ScheduleMeetingModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState('30');
  const [participantEmail, setParticipantEmail] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [syncToGoogle, setSyncToGoogle] = useState(googleConnected);
  const [loading, setLoading] = useState(false);

  const addParticipant = () => {
    if (participantEmail && !participants.includes(participantEmail)) {
      setParticipants([...participants, participantEmail]);
      setParticipantEmail('');
    }
  };

  const removeParticipant = (email: string) => {
    setParticipants(participants.filter((p) => p !== email));
  };

  const handleSubmit = async () => {
    if (!title || !date) return;

    setLoading(true);
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledAt = new Date(date);
      scheduledAt.setHours(hours, minutes, 0, 0);

      await onSchedule(
        title,
        description,
        scheduledAt,
        parseInt(duration),
        participants,
        syncToGoogle
      );

      // Reset form
      setTitle('');
      setDescription('');
      setDate(undefined);
      setTime('09:00');
      setDuration('30');
      setParticipants([]);
      setSyncToGoogle(googleConnected);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Schedule Meeting
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Meeting Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team Standup"
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this meeting about?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Invite Participants
            </Label>
            <div className="flex gap-2">
              <Input
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                placeholder="Enter email address"
                type="email"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
              />
              <Button type="button" variant="outline" onClick={addParticipant}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {participants.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md text-sm"
                  >
                    <span>{email}</span>
                    <button
                      onClick={() => removeParticipant(email)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {googleConnected && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-5 w-5">
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
                <Label htmlFor="sync-google" className="cursor-pointer">
                  Sync to Google Calendar
                </Label>
              </div>
              <Switch
                id="sync-google"
                checked={syncToGoogle}
                onCheckedChange={setSyncToGoogle}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title || !date || loading}>
            {loading ? 'Scheduling...' : 'Schedule Meeting'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
