import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") || "";
const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
  SITE_URL,
].filter(Boolean);

const MAX_PARTICIPANTS = 8;

function cors(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomId(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  let bin = "";
  buf.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function assertPeerOrRoomId(value: string, label: string) {
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(value)) throw new Error(`Invalid ${label}`);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

const createLimit = new Map<string, { count: number; reset: number }>();

serve(async (req: Request) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    const body = await req.json();
    const action = body.action as string;

    async function assertHost(roomId: string, hostToken?: string) {
      const { data: room, error } = await supabase
        .from("meeting_rooms")
        .select("id, host_token_hash, host_user_id, admitted, kicked, mute_epoch")
        .eq("id", roomId)
        .maybeSingle();
      if (error || !room) throw new Error("Room not found");

      const tokenOk = hostToken && timingSafeEqual(room.host_token_hash, await sha256Hex(hostToken));
      const userOk = userId && room.host_user_id === userId;
      if (!tokenOk && !userOk) throw new Error("Not the host");
      return room;
    }

    switch (action) {
      case "get": {
        const roomId = String(body.roomId || "");
        assertPeerOrRoomId(roomId, "roomId");
        const { data: room, error } = await supabase
          .from("meeting_rooms")
          .select("id, name, admitted, kicked, waiting_room_enabled, allow_chat, allow_screen_share, allow_reactions, mute_epoch, host_peer_id")
          .eq("id", roomId)
          .maybeSingle();
        if (error || !room) throw new Error("Room not found");
        return new Response(JSON.stringify(room), {
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      case "create": {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const now = Date.now();
        const bucket = createLimit.get(ip);
        if (!bucket || now > bucket.reset) createLimit.set(ip, { count: 1, reset: now + 60_000 });
        else if (bucket.count >= 10) throw new Error("Too many rooms created. Try again later.");
        else bucket.count++;

        const roomId = randomId(16);
        const hostToken = randomToken();
        const host_token_hash = await sha256Hex(hostToken);
        const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : "Meeting Room";

        const { error } = await supabase.from("meeting_rooms").insert({
          id: roomId,
          name,
          host_token_hash,
          host_user_id: userId,
        });
        if (error) throw error;

        return new Response(JSON.stringify({ roomId, hostToken, name }), {
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      case "guest-enter": {
        const roomId = String(body.roomId || "");
        const peerId = String(body.peerId || "");
        assertPeerOrRoomId(roomId, "roomId");
        assertPeerOrRoomId(peerId, "peerId");
        const { data: room, error } = await supabase
          .from("meeting_rooms")
          .select("admitted, kicked, waiting_room_enabled")
          .eq("id", roomId)
          .maybeSingle();
        if (error || !room) throw new Error("Room not found");
        if ((room.kicked || []).includes(peerId)) throw new Error("You were removed from the meeting");
        if (room.waiting_room_enabled) {
          return new Response(JSON.stringify({ ok: true, waiting: true, admitted: room.admitted || [] }), {
            headers: { ...headers, "Content-Type": "application/json" },
          });
        }
        const { data: admitted, error: admitError } = await supabase.rpc("meeting_room_admit", {
          p_room_id: roomId,
          p_peer_id: peerId,
        });
        if (admitError) throw admitError;
        if ((admitted || []).length >= MAX_PARTICIPANTS && !(admitted || []).includes(peerId)) {
          throw new Error("Meeting is full");
        }
        return new Response(JSON.stringify({ ok: true, waiting: false, admitted: admitted || [] }), {
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      case "host-enter": {
        const roomId = String(body.roomId || "");
        const peerId = String(body.peerId || "");
        assertPeerOrRoomId(roomId, "roomId");
        assertPeerOrRoomId(peerId, "peerId");
        const room = await assertHost(roomId, body.hostToken);
        const { data: admitted, error: admitError } = await supabase.rpc("meeting_room_admit", {
          p_room_id: roomId,
          p_peer_id: peerId,
          p_force: true,
        });
        if (admitError) throw admitError;
        const kicked = (room.kicked || []).filter((id: string) => id !== peerId);
        await supabase.from("meeting_rooms").update({ kicked, host_peer_id: peerId }).eq("id", roomId);
        return new Response(JSON.stringify({ ok: true, admitted: admitted || [] }), {
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      case "admit": {
        const roomId = String(body.roomId || "");
        const participantId = String(body.participantId || "");
        assertPeerOrRoomId(roomId, "roomId");
        assertPeerOrRoomId(participantId, "peerId");
        const room = await assertHost(roomId, body.hostToken);
        if ((room.kicked || []).includes(participantId)) {
          throw new Error("Participant was removed");
        }
        const { data: admitted, error: admitError } = await supabase.rpc("meeting_room_admit", {
          p_room_id: roomId,
          p_peer_id: participantId,
        });
        if (admitError) throw admitError;
        if ((admitted || []).length >= MAX_PARTICIPANTS && !(admitted || []).includes(participantId)) {
          throw new Error("Meeting is full");
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      case "kick": {
        const roomId = String(body.roomId || "");
        const participantId = String(body.participantId || "");
        assertPeerOrRoomId(roomId, "roomId");
        assertPeerOrRoomId(participantId, "peerId");
        const room = await assertHost(roomId, body.hostToken);
        const admitted = (room.admitted || []).filter((id: string) => id !== participantId);
        const kicked = Array.from(new Set([...(room.kicked || []), participantId]));
        await supabase.from("meeting_rooms").update({ admitted, kicked }).eq("id", roomId);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      case "mute-all": {
        const roomId = String(body.roomId || "");
        assertPeerOrRoomId(roomId, "roomId");
        const room = await assertHost(roomId, body.hostToken);
        await supabase.from("meeting_rooms").update({ mute_epoch: (room.mute_epoch || 0) + 1 }).eq("id", roomId);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      case "settings": {
        const roomId = String(body.roomId || "");
        assertPeerOrRoomId(roomId, "roomId");
        await assertHost(roomId, body.hostToken);
        const patch: Record<string, boolean> = {};
        for (const key of ["waiting_room_enabled", "allow_chat", "allow_screen_share", "allow_reactions"] as const) {
          if (typeof body[key] === "boolean") patch[key] = body[key];
        }
        if (Object.keys(patch).length) {
          await supabase.from("meeting_rooms").update(patch).eq("id", roomId);
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error("Unknown action");
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "Not the host" ? 403 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors(req.headers.get("origin")), "Content-Type": "application/json" },
    });
  }
});
