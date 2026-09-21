import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const SITE_URL = Deno.env.get("SITE_URL") || "";
const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
  SITE_URL,
].filter(Boolean);

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = ALLOWED_ORIGINS.find((allowed) => origin === allowed);
  return {
    "Access-Control-Allow-Origin": allowedOrigin || "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] ?? char;
  });
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid user token");

    const body = await req.json();
    const { meetingId, emails } = body as { meetingId: string; emails: string[] };

    if (!meetingId || !Array.isArray(emails)) {
      throw new Error("Missing invite fields");
    }

    const { data: meeting } = await supabase
      .from("scheduled_meetings")
      .select("id, host_id, title, description, scheduled_at, duration_minutes, meeting_link")
      .eq("id", meetingId)
      .maybeSingle();

    if (!meeting || meeting.host_id !== user.id) {
      throw new Error("Meeting not found");
    }

    let joinUrl: URL;
    try {
      joinUrl = new URL(meeting.meeting_link);
    } catch {
      throw new Error("Invalid meeting link");
    }
    const requestOrigin = req.headers.get("origin");
    const originOk =
      ALLOWED_ORIGINS.includes(joinUrl.origin) ||
      (requestOrigin !== null && requestOrigin === joinUrl.origin && ALLOWED_ORIGINS.includes(requestOrigin));
    if (!originOk || !joinUrl.pathname.startsWith("/join/")) {
      throw new Error("Meeting link is not a MeetFlow join URL");
    }

    const title = meeting.title as string;
    const description = (meeting.description as string) || "";
    const scheduledAt = meeting.scheduled_at as string;
    const durationMinutes = meeting.duration_minutes as number;
    const meetingLink = joinUrl.toString();

    const validEmails = emails.filter((email) => EMAIL_REGEX.test(email)).slice(0, 20);
    const when = new Date(scheduledAt).toUTCString();
    const fromAddress = Deno.env.get("RESEND_FROM") || "MeetFlow <onboarding@resend.dev>";

    for (const email of validEmails) {
      await resend.emails.send({
        from: fromAddress,
        to: [email],
        subject: `You're invited: ${title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>MeetFlow invitation</h2>
            <p>You were invited to <strong>${escapeHtml(title)}</strong>.</p>
            <p>${escapeHtml(description || "")}</p>
            <p><strong>When:</strong> ${escapeHtml(when)}</p>
            <p><strong>Duration:</strong> ${Number(durationMinutes) || 30} minutes</p>
            <a href="${escapeHtml(meetingLink)}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Join meeting</a>
          </div>
        `,
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

      if (profile?.id) {
        await supabase.from("notifications").insert({
          user_id: profile.id,
          title: "Meeting invite",
          message: `You're invited to "${title}"`,
          type: "invite",
          meeting_id: meetingId,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, sent: validEmails.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" },
    });
  }
});
