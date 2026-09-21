import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage, Participant, Reaction } from "@/types/conference";
import {
  MAX_CHAT_MESSAGES,
  MAX_PARTICIPANTS,
  getHostToken,
  getOrCreatePeerId,
} from "@/lib/meeting";

type PresenceMeta = {
  name: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
  status: "waiting" | "in-meeting";
};

type SignalPayload = {
  kind: "offer" | "answer" | "ice";
  from: string;
  to: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type RoomRow = {
  id: string;
  name: string;
  admitted: string[] | null;
  kicked: string[] | null;
  waiting_room_enabled: boolean;
  allow_chat: boolean;
  allow_screen_share: boolean;
  allow_reactions: boolean;
  mute_epoch: number;
  host_peer_id?: string | null;
};

function iceServers(): RTCIceServer[] {
  return [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
}

async function meetingAction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("meeting-room", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useRealtimeMeeting(options: {
  roomId: string;
  roomName: string;
  userName: string;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
}) {
  const {
    roomId,
    roomName,
    userName,
    localStream,
    screenStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    handRaised,
  } = options;

  const selfId = useRef(getOrCreatePeerId(roomId));
  const hostToken = useRef(getHostToken(roomId));
  const channelRef = useRef<RealtimeChannel | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const offeredRef = useRef<Set<string>>(new Set());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef(localStream);
  const admittedRef = useRef<string[]>([]);
  const hostPeerIdRef = useRef<string | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitingRoom, setWaitingRoom] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isHost, setIsHost] = useState(Boolean(hostToken.current));
  const [isAdmitted, setIsAdmitted] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [roomFull, setRoomFull] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [allowChat, setAllowChat] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [muteEpoch, setMuteEpoch] = useState(0);

  localStreamRef.current = localStream;

  const applyRoom = useCallback((row: RoomRow) => {
    const admitted = row.admitted || [];
    const kickedList = row.kicked || [];
    admittedRef.current = admitted;
    if (row.host_peer_id) hostPeerIdRef.current = row.host_peer_id;
    setAllowChat(row.allow_chat);
    setAllowReactions(row.allow_reactions);
    setAllowScreenShare(row.allow_screen_share);
    setMuteEpoch(row.mute_epoch);
    if (kickedList.includes(selfId.current)) {
      setKicked(true);
      setIsAdmitted(false);
      return;
    }
    const inCall = admitted.includes(selfId.current);
    setIsAdmitted(inCall);
    if (admitted.length >= MAX_PARTICIPANTS && !inCall) setRoomFull(true);
  }, []);

  const closePeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    pc?.close();
    peersRef.current.delete(peerId);
    offeredRef.current.delete(peerId);
    pendingIceRef.current.delete(peerId);
    setRemoteStreams((prev) => {
      if (!prev.has(peerId)) return prev;
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  const sendSignal = useCallback(async (payload: SignalPayload) => {
    await channelRef.current?.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const outboundVideoTrack = useCallback(() => {
    return screenStream?.getVideoTracks()[0] || localStreamRef.current?.getVideoTracks()[0] || null;
  }, [screenStream]);

  const ensurePeer = useCallback(
    (peerId: string) => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      const stream = localStreamRef.current;
      stream?.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
      const video = outboundVideoTrack() || stream?.getVideoTracks()[0];
      if (video && stream) pc.addTrack(video, stream);

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        void sendSignal({
          kind: "ice",
          from: selfId.current,
          to: peerId,
          candidate: event.candidate.toJSON(),
        });
      };

      pc.ontrack = (event) => {
        const [remote] = event.streams;
        if (!remote) return;
        setRemoteStreams((prev) => new Map(prev).set(peerId, remote));
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          closePeer(peerId);
        }
      };

      peersRef.current.set(peerId, pc);
      return pc;
    },
    [closePeer, outboundVideoTrack, sendSignal],
  );

  const callPeer = useCallback(
    async (peerId: string) => {
      if (peerId === selfId.current || offeredRef.current.has(peerId)) return;
      if (!admittedRef.current.includes(selfId.current) || !admittedRef.current.includes(peerId)) return;
      offeredRef.current.add(peerId);
      const pc = ensurePeer(peerId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal({
          kind: "offer",
          from: selfId.current,
          to: peerId,
          description: { type: offer.type, sdp: offer.sdp },
        });
      } catch (error) {
        offeredRef.current.delete(peerId);
        console.error("Failed to create offer", error);
      }
    },
    [ensurePeer, sendSignal],
  );

  const handleSignal = useCallback(
    async (payload: SignalPayload) => {
      if (payload.to !== selfId.current) return;
      if (!admittedRef.current.includes(selfId.current)) return;
      if (!admittedRef.current.includes(payload.from)) return;
      const pc = ensurePeer(payload.from);
      try {
        if (payload.kind === "offer" && payload.description) {
          if (pc.signalingState !== "stable" && pc.signalingState !== "have-local-offer") {
            return;
          }
          if (pc.signalingState === "have-local-offer" && selfId.current > payload.from) {
            await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
            offeredRef.current.delete(payload.from);
          }
          await pc.setRemoteDescription(payload.description);
          for (const candidate of pendingIceRef.current.get(payload.from) ?? []) {
            await pc.addIceCandidate(candidate);
          }
          pendingIceRef.current.delete(payload.from);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal({
            kind: "answer",
            from: selfId.current,
            to: payload.from,
            description: { type: answer.type, sdp: answer.sdp },
          });
        } else if (payload.kind === "answer" && payload.description) {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(payload.description);
          }
        } else if (payload.kind === "ice" && payload.candidate) {
          if (pc.remoteDescription) await pc.addIceCandidate(payload.candidate);
          else {
            const queued = pendingIceRef.current.get(payload.from) ?? [];
            queued.push(payload.candidate);
            pendingIceRef.current.set(payload.from, queued);
          }
        }
      } catch (error) {
        console.error("Signal error", error);
        setConnectionError("A peer connection failed. Try rejoining.");
      }
    },
    [ensurePeer, sendSignal],
  );

  const trackPresence = useCallback(
    async (status: PresenceMeta["status"]) => {
      await channelRef.current?.track({
        name: userName,
        isHost: isHost,
        isMuted,
        isVideoOff,
        isScreenSharing,
        isSpeaking: false,
        handRaised,
        status,
      } satisfies PresenceMeta);
    },
    [handRaised, isHost, isMuted, isScreenSharing, isVideoOff, userName],
  );

  useEffect(() => {
    if (!roomId || !userName) return;
    let cancelled = false;

    const channel = supabase.channel(`meeting:${roomId}`, {
      config: { broadcast: { self: false }, presence: { key: selfId.current } },
    });
    channelRef.current = channel;

    const presenceSnapshot = () => {
      const state = channel.presenceState<PresenceMeta>();
      const people: (Participant & { status: PresenceMeta["status"] })[] = [];
      Object.entries(state).forEach(([id, metas]) => {
        const meta = metas[0];
        if (!meta) return;
        people.push({
          id,
          name: meta.name,
          isHost: id === hostPeerIdRef.current,
          isMuted: meta.isMuted,
          isVideoOff: meta.isVideoOff,
          isScreenSharing: meta.isScreenSharing,
          isSpeaking: meta.isSpeaking,
          handRaised: meta.handRaised,
          stream: undefined,
          status: meta.status,
        });
      });
      setParticipants(people.filter((p) => p.status === "in-meeting"));
      setWaitingRoom(people.filter((p) => p.status === "waiting"));
      people
        .filter((p) => p.status === "in-meeting" && p.id !== selfId.current)
        .forEach((peer) => {
          if (selfId.current > peer.id) void callPeer(peer.id);
        });
      const inCall = new Set(people.filter((p) => p.status === "in-meeting").map((p) => p.id));
      [...peersRef.current.keys()].forEach((id) => {
        if (!inCall.has(id)) closePeer(id);
      });
    };

    channel
      .on("presence", { event: "sync" }, presenceSnapshot)
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        void handleSignal(payload as SignalPayload);
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        const message = payload as ChatMessage;
        if (!admittedRef.current.includes(message.senderId)) return;
        setMessages((prev) =>
          [...prev, { ...message, timestamp: new Date(message.timestamp) }].slice(-MAX_CHAT_MESSAGES),
        );
      })
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        const reaction = payload as Reaction;
        if (!admittedRef.current.includes(reaction.senderId)) return;
        setReactions((prev) => [...prev, { ...reaction, timestamp: new Date(reaction.timestamp) }]);
        setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== reaction.id)), 2000);
      });

    const refreshRoom = async () => {
      const row = await meetingAction({ action: "get", roomId });
      if (!cancelled && row) applyRoom(row as RoomRow);
    };

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED" || cancelled) {
        if (status === "CHANNEL_ERROR") setConnectionError("Could not connect to the meeting channel.");
        return;
      }

      try {
        await refreshRoom();
        if (cancelled) return;

        try {
          const hostResult = await meetingAction({
            action: "host-enter",
            roomId,
            peerId: selfId.current,
            hostToken: hostToken.current || undefined,
          });
          setIsHost(true);
          if (Array.isArray(hostResult?.admitted)) admittedRef.current = hostResult.admitted;
          hostPeerIdRef.current = selfId.current;
          setIsAdmitted(true);
        } catch {
          const result = await meetingAction({
            action: "guest-enter",
            roomId,
            peerId: selfId.current,
          });
          setIsHost(false);
          if (Array.isArray(result?.admitted)) admittedRef.current = result.admitted;
          if (result?.waiting === false) setIsAdmitted(true);
        }

        await refreshRoom();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not join";
        if (message.includes("full")) setRoomFull(true);
        else if (message.includes("removed")) setKicked(true);
        else setConnectionError(message);
        return;
      }

      const admitted = admittedRef.current.includes(selfId.current);
      await trackPresence(admitted ? "in-meeting" : "waiting");
      setMessages([
        {
          id: crypto.randomUUID(),
          senderId: "system",
          senderName: "System",
          content: admitted ? `Meeting "${roomName}" started` : "Waiting for the host to admit you",
          timestamp: new Date(),
          type: "system",
        },
      ]);
    });

    const poll = window.setInterval(() => {
      void refreshRoom().catch(() => undefined);
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      const peers = peersRef.current;
      peers.forEach((pc) => pc.close());
      peers.clear();
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userName]);

  useEffect(() => {
    void trackPresence(isAdmitted ? "in-meeting" : "waiting");
  }, [isAdmitted, trackPresence]);

  useEffect(() => {
    if (!localStream && !screenStream) return;
    peersRef.current.forEach((pc) => {
      const videoTrack = screenStream?.getVideoTracks()[0] || localStream?.getVideoTracks()[0] || null;
      const audioTrack = localStream?.getAudioTracks()[0] || null;
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === "video" && videoTrack) void sender.replaceTrack(videoTrack);
        if (sender.track?.kind === "audio" && audioTrack) void sender.replaceTrack(audioTrack);
      });
    });
  }, [localStream, screenStream]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!allowChat || !isAdmitted) return;
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        senderId: selfId.current,
        senderName: userName,
        content: content.slice(0, 2000),
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, message].slice(-MAX_CHAT_MESSAGES));
      await channelRef.current?.send({ type: "broadcast", event: "chat", payload: message });
    },
    [allowChat, isAdmitted, userName],
  );

  const sendReaction = useCallback(
    async (emoji: string) => {
      if (!allowReactions || !isAdmitted) return;
      const reaction: Reaction = {
        id: crypto.randomUUID(),
        emoji,
        senderId: selfId.current,
        timestamp: new Date(),
      };
      setReactions((prev) => [...prev, reaction]);
      setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== reaction.id)), 2000);
      await channelRef.current?.send({ type: "broadcast", event: "reaction", payload: reaction });
    },
    [allowReactions, isAdmitted],
  );

  const admitParticipant = useCallback(async (participantId: string) => {
    if (!isHost) return;
    await meetingAction({
      action: "admit",
      roomId,
      participantId,
      hostToken: hostToken.current || undefined,
    });
  }, [isHost, roomId]);

  const removeParticipant = useCallback(async (participantId: string) => {
    if (!isHost) return;
    await meetingAction({
      action: "kick",
      roomId,
      participantId,
      hostToken: hostToken.current || undefined,
    });
    closePeer(participantId);
  }, [closePeer, isHost, roomId]);

  const muteAll = useCallback(async () => {
    if (!isHost) return;
    await meetingAction({ action: "mute-all", roomId, hostToken: hostToken.current || undefined });
  }, [isHost, roomId]);

  const leaveRoom = useCallback(async () => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    if (channelRef.current) {
      await channelRef.current.untrack();
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const displayParticipants = useMemo(
    () =>
      participants.map((p) => ({
        ...p,
        stream: p.id === selfId.current ? localStream ?? undefined : remoteStreams.get(p.id),
      })),
    [localStream, participants, remoteStreams],
  );

  return {
    selfId: selfId.current,
    participants: displayParticipants,
    waitingRoom,
    messages,
    reactions,
    isHost,
    isAdmitted,
    kicked,
    roomFull,
    connectionError,
    allowChat,
    allowReactions,
    allowScreenShare,
    muteEpoch,
    sendMessage,
    sendReaction,
    admitParticipant,
    removeParticipant,
    muteAll,
    leaveRoom,
  };
}
