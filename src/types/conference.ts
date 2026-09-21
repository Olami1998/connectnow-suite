export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  handRaised?: boolean;
  stream?: MediaStream;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

export interface Reaction {
  id: string;
  emoji: string;
  senderId: string;
  timestamp: Date;
}

export interface RoomSettings {
  waitingRoomEnabled: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  allowReactions: boolean;
  maxParticipants: number;
  quality: 'auto' | 'low' | 'medium' | 'high';
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  participants: Participant[];
  waitingRoom: Participant[];
  settings: RoomSettings;
  isRecording: boolean;
  startTime?: Date;
}

export type VideoQuality = 'auto' | 'low' | 'medium' | 'high';

export interface QualityPreset {
  label: string;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
}

export const QUALITY_PRESETS: Record<Exclude<VideoQuality, 'auto'>, QualityPreset> = {
  low: { label: 'Low (360p)', width: 640, height: 360, frameRate: 15, bitrate: 500000 },
  medium: { label: 'Medium (720p)', width: 1280, height: 720, frameRate: 24, bitrate: 1500000 },
  high: { label: 'High (1080p)', width: 1920, height: 1080, frameRate: 30, bitrate: 4000000 },
};

export const REACTION_EMOJIS = ['👍', '👏', '❤️', '😂', '😮', '🎉', '🔥', '💯'];

export const VIRTUAL_BACKGROUNDS = [
  { id: 'none', label: 'None', type: 'none' as const },
  { id: 'blur', label: 'Blur', type: 'blur' as const },
];
