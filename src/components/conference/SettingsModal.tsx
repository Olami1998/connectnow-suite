import { useState } from 'react';
import { X, Monitor, Camera, Mic, Palette, Sliders } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VideoQuality, QUALITY_PRESETS, VIRTUAL_BACKGROUNDS } from '@/types/conference';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioDevices: { deviceId: string; label: string }[];
  videoDevices: { deviceId: string; label: string }[];
  selectedAudioDevice: string;
  selectedVideoDevice: string;
  currentQuality: VideoQuality;
  onSelectAudioDevice: (deviceId: string) => void;
  onSelectVideoDevice: (deviceId: string) => void;
  onSelectQuality: (quality: VideoQuality) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  audioDevices,
  videoDevices,
  selectedAudioDevice,
  selectedVideoDevice,
  currentQuality,
  onSelectAudioDevice,
  onSelectVideoDevice,
  onSelectQuality,
}: SettingsModalProps) {
  const [selectedBackground, setSelectedBackground] = useState('none');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="devices" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="devices" className="gap-2">
              <Sliders className="h-4 w-4" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="video" className="gap-2">
              <Camera className="h-4 w-4" />
              Video
            </TabsTrigger>
            <TabsTrigger value="background" className="gap-2">
              <Palette className="h-4 w-4" />
              Background
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="mt-4 space-y-6">
            {/* Microphone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Microphone
              </Label>
              <Select
                value={selectedAudioDevice}
                onValueChange={onSelectAudioDevice}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {audioDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Camera */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Camera
              </Label>
              <Select
                value={selectedVideoDevice}
                onValueChange={onSelectVideoDevice}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {videoDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="video" className="mt-4 space-y-6">
            {/* Quality */}
            <div className="space-y-3">
              <Label>Video Quality</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['auto', 'low', 'medium', 'high'] as VideoQuality[]).map(
                  (quality) => (
                    <button
                      key={quality}
                      onClick={() => onSelectQuality(quality)}
                      className={cn(
                        'rounded-lg border p-3 text-left transition-all',
                        currentQuality === quality
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="font-medium capitalize">{quality}</div>
                      <div className="text-xs text-muted-foreground">
                        {quality === 'auto'
                          ? 'Adapts to network'
                          : QUALITY_PRESETS[quality].label}
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Mirror Video */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Mirror my video</Label>
                <p className="text-xs text-muted-foreground">
                  Flip your video horizontally
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            {/* HD Video */}
            <div className="flex items-center justify-between">
              <div>
                <Label>HD video</Label>
                <p className="text-xs text-muted-foreground">
                  Enable high-definition video (uses more bandwidth)
                </p>
              </div>
              <Switch />
            </div>
          </TabsContent>

          <TabsContent value="background" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose a virtual background for your video
              </p>
              <div className="grid grid-cols-3 gap-3">
                {VIRTUAL_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBackground(bg.id)}
                    className={cn(
                      'aspect-video rounded-lg border-2 p-2 transition-all',
                      selectedBackground === bg.id
                        ? 'border-primary'
                        : 'border-transparent hover:border-primary/50',
                      bg.type === 'none' && 'bg-secondary',
                      bg.type === 'blur' && 'bg-gradient-to-br from-secondary to-muted',
                      bg.type === 'image' && 'bg-muted'
                    )}
                  >
                    <div className="flex h-full items-center justify-center text-xs font-medium">
                      {bg.label}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Note: Virtual backgrounds require additional processing power
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
