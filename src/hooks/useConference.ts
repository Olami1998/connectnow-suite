import { useState, useCallback, useRef } from 'react';
import { Participant, ChatMessage, Reaction, Room, RoomSettings } from '@/types/conference';

interface UseConferenceReturn {
  room: Room | null;
  participants: Participant[];
  waitingRoom: Participant[];
  messages: ChatMessage[];
  reactions: Reaction[];
  isRecording: boolean;
  isHost: boolean;
  createRoom: (name: string, hostName: string) => string;
  joinRoom: (roomId: string, participantName: string) => void;
  leaveRoom: () => void;
  admitParticipant: (participantId: string) => void;
  removeParticipant: (participantId: string) => void;
  sendMessage: (content: string) => void;
  sendReaction: (emoji: string) => void;
  toggleRecording: () => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
  generateInviteLink: () => string;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export function useConference(): UseConferenceReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitingRoom, setWaitingRoom] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const currentUserId = useRef(generateId());

  const createRoom = useCallback((name: string, hostName: string): string => {
    const roomId = generateId();
    const hostParticipant: Participant = {
      id: currentUserId.current,
      name: hostName,
      isHost: true,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      isSpeaking: false,
    };

    const newRoom: Room = {
      id: roomId,
      name,
      hostId: currentUserId.current,
      participants: [hostParticipant],
      waitingRoom: [],
      settings: {
        waitingRoomEnabled: true,
        allowScreenShare: true,
        allowChat: true,
        allowReactions: true,
        maxParticipants: 8,
        quality: 'auto',
      },
      isRecording: false,
      startTime: new Date(),
    };

    setRoom(newRoom);
    setParticipants([hostParticipant]);
    setIsHost(true);

    // Add system message
    const systemMessage: ChatMessage = {
      id: generateId(),
      senderId: 'system',
      senderName: 'System',
      content: `Meeting "${name}" started`,
      timestamp: new Date(),
      type: 'system',
    };
    setMessages([systemMessage]);

    return roomId;
  }, []);

  const joinRoom = useCallback((roomId: string, participantName: string) => {
    const newParticipant: Participant = {
      id: currentUserId.current,
      name: participantName,
      isHost: false,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      isSpeaking: false,
    };

    // Simulate joining - in real app this would connect to signaling server
    setParticipants((prev) => [...prev, newParticipant]);

    const joinMessage: ChatMessage = {
      id: generateId(),
      senderId: 'system',
      senderName: 'System',
      content: `${participantName} joined the meeting`,
      timestamp: new Date(),
      type: 'system',
    };
    setMessages((prev) => [...prev, joinMessage]);
  }, []);

  const leaveRoom = useCallback(() => {
    setRoom(null);
    setParticipants([]);
    setWaitingRoom([]);
    setMessages([]);
    setReactions([]);
    setIsRecording(false);
    setIsHost(false);
  }, []);

  const admitParticipant = useCallback((participantId: string) => {
    const participant = waitingRoom.find((p) => p.id === participantId);
    if (participant) {
      setWaitingRoom((prev) => prev.filter((p) => p.id !== participantId));
      setParticipants((prev) => [...prev, participant]);

      const joinMessage: ChatMessage = {
        id: generateId(),
        senderId: 'system',
        senderName: 'System',
        content: `${participant.name} joined the meeting`,
        timestamp: new Date(),
        type: 'system',
      };
      setMessages((prev) => [...prev, joinMessage]);
    }
  }, [waitingRoom]);

  const removeParticipant = useCallback((participantId: string) => {
    const participant = participants.find((p) => p.id === participantId);
    if (participant) {
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));

      const leaveMessage: ChatMessage = {
        id: generateId(),
        senderId: 'system',
        senderName: 'System',
        content: `${participant.name} was removed from the meeting`,
        timestamp: new Date(),
        type: 'system',
      };
      setMessages((prev) => [...prev, leaveMessage]);
    }
  }, [participants]);

  const sendMessage = useCallback((content: string) => {
    const currentUser = participants.find((p) => p.id === currentUserId.current);
    if (!currentUser) return;

    const message: ChatMessage = {
      id: generateId(),
      senderId: currentUserId.current,
      senderName: currentUser.name,
      content,
      timestamp: new Date(),
      type: 'text',
    };
    setMessages((prev) => [...prev, message]);
  }, [participants]);

  const sendReaction = useCallback((emoji: string) => {
    const reaction: Reaction = {
      id: generateId(),
      emoji,
      senderId: currentUserId.current,
      timestamp: new Date(),
    };
    setReactions((prev) => [...prev, reaction]);

    // Auto-remove reaction after animation
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 2000);
  }, []);

  const toggleRecording = useCallback(() => {
    setIsRecording((prev) => !prev);

    const message: ChatMessage = {
      id: generateId(),
      senderId: 'system',
      senderName: 'System',
      content: isRecording ? 'Recording stopped' : 'Recording started',
      timestamp: new Date(),
      type: 'system',
    };
    setMessages((prev) => [...prev, message]);
  }, [isRecording]);

  const updateSettings = useCallback((settings: Partial<RoomSettings>) => {
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        settings: { ...prev.settings, ...settings },
      };
    });
  }, []);

  const generateInviteLink = useCallback(() => {
    if (!room) return '';
    return `${window.location.origin}/join/${room.id}`;
  }, [room]);

  return {
    room,
    participants,
    waitingRoom,
    messages,
    reactions,
    isRecording,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    admitParticipant,
    removeParticipant,
    sendMessage,
    sendReaction,
    toggleRecording,
    updateSettings,
    generateInviteLink,
  };
}
