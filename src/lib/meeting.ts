export const MAX_PARTICIPANTS = 8;
export const MAX_CHAT_MESSAGES = 200;

export function parseMeetingInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const joinMatch = url.pathname.match(/\/join\/([^/?#]+)/);
    if (joinMatch?.[1]) {
      const id = decodeURIComponent(joinMatch[1]);
      if (/^[a-zA-Z0-9_-]{8,64}$/.test(id)) return id;
    }
    const room = url.searchParams.get("room");
    if (room && /^[a-zA-Z0-9_-]{8,64}$/.test(room)) return room;
  } catch {
    // Not a full URL.
  }

  const code = trimmed.replace(/^#/, "").split("/").filter(Boolean).pop() ?? "";
  if (/^[a-zA-Z0-9_-]{8,64}$/.test(code)) return code;
  return null;
}

export function meetingJoinPath(roomId: string): string {
  return `/join/${roomId}`;
}

export function meetingInviteUrl(
  roomId: string,
  origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
  return `${origin}${meetingJoinPath(roomId)}`;
}

const hostKey = (roomId: string) => `meetflow_host_${roomId}`;
const peerKey = (roomId: string) => `meetflow_peer_${roomId}`;

export function saveHostToken(roomId: string, token: string) {
  sessionStorage.setItem(hostKey(roomId), token);
}

export function getHostToken(roomId: string): string | null {
  return sessionStorage.getItem(hostKey(roomId));
}

export function getOrCreatePeerId(roomId: string): string {
  const existing = localStorage.getItem(peerKey(roomId));
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(peerKey(roomId), id);
  return id;
}

export function clearMeetingSession(roomId: string) {
  localStorage.removeItem(peerKey(roomId));
}
