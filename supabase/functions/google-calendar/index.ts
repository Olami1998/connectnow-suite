import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";

// Allowed origins for CORS and redirect validation
const APP_URL = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "";
const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://id-preview--d35ff490-bf53-4f82-ba0d-250953b760fa.lovable.app",
  "https://glide-video-chat.lovable.app",
].filter(Boolean);

// Rate limiting: track requests per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  userLimit.count++;
  return false;
}

// Get CORS headers based on request origin
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = ALLOWED_ORIGINS.find(allowed => origin === allowed);
  return {
    "Access-Control-Allow-Origin": allowedOrigin || ALLOWED_ORIGINS[0] || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Validate redirect URI against allowed origins
function validateRedirectUri(redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri);
    return ALLOWED_ORIGINS.some(origin => {
      try {
        const allowedUrl = new URL(origin);
        return url.origin === allowedUrl.origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

// Email validation regex
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

interface CalendarEventRequest {
  action: "get-auth-url" | "exchange-code" | "create-event" | "delete-event" | "check-connection";
  code?: string;
  redirectUri?: string;
  meetingId?: string;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  attendees?: string[];
  eventId?: string;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token refresh failed:", error);
    throw new Error("Failed to refresh access token");
  }

  return response.json();
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokenData, error } = await supabase
    .from("google_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !tokenData) {
    console.log("No Google tokens found for user");
    return null;
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    if (!tokenData.refresh_token) {
      console.log("No refresh token available");
      return null;
    }

    try {
      const refreshed = await refreshAccessToken(tokenData.refresh_token);
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

      await supabase
        .from("google_tokens")
        .update({
          access_token: refreshed.access_token,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq("user_id", userId);

      return refreshed.access_token;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      return null;
    }
  }

  return tokenData.access_token;
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Check rate limit
    if (isRateLimited(user.id)) {
      console.warn(`Rate limit exceeded for user: ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, code, redirectUri, title, description, startTime, endTime, attendees, eventId, meetingId }: CalendarEventRequest = await req.json();

    console.log(`Processing action: ${action} for user: ${user.id}`);

    switch (action) {
      case "get-auth-url": {
        if (!redirectUri) {
          throw new Error("Redirect URI is required");
        }

        // Validate redirect URI against allowlist
        if (!validateRedirectUri(redirectUri)) {
          console.warn(`Invalid redirect URI attempted: ${redirectUri}`);
          throw new Error("Invalid redirect URI");
        }

        const scopes = [
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/calendar.readonly",
        ].join(" ");

        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", scopes);
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
        authUrl.searchParams.set("state", user.id);

        return new Response(
          JSON.stringify({ authUrl: authUrl.toString() }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "exchange-code": {
        if (!code || !redirectUri) {
          throw new Error("Code and redirect URI are required");
        }

        // Validate redirect URI against allowlist
        if (!validateRedirectUri(redirectUri)) {
          console.warn(`Invalid redirect URI in exchange: ${redirectUri}`);
          throw new Error("Invalid redirect URI");
        }

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          console.error("Token exchange failed:", error);
          throw new Error("Failed to exchange authorization code");
        }

        const tokens = await tokenResponse.json();
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Store tokens
        await supabase
          .from("google_tokens")
          .upsert({
            user_id: user.id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt.toISOString(),
          });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check-connection": {
        const accessToken = await getValidAccessToken(supabase, user.id);
        return new Response(
          JSON.stringify({ connected: !!accessToken }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create-event": {
        if (!title || !startTime || !endTime) {
          throw new Error("Title, start time, and end time are required");
        }

        // Validate attendee emails if provided
        if (attendees && attendees.length > 0) {
          const invalidEmails = attendees.filter(email => !isValidEmail(email));
          if (invalidEmails.length > 0) {
            throw new Error(`Invalid email format: ${invalidEmails.join(", ")}`);
          }
        }

        const accessToken = await getValidAccessToken(supabase, user.id);
        if (!accessToken) {
          throw new Error("Not connected to Google Calendar");
        }

        const event = {
          summary: title,
          description: description || "",
          start: {
            dateTime: startTime,
            timeZone: "UTC",
          },
          end: {
            dateTime: endTime,
            timeZone: "UTC",
          },
          attendees: attendees?.map((email) => ({ email })) || [],
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
            },
          },
        };

        const calendarResponse = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
          }
        );

        if (!calendarResponse.ok) {
          const error = await calendarResponse.text();
          console.error("Calendar API error:", error);
          throw new Error("Failed to create calendar event");
        }

        const createdEvent = await calendarResponse.json();

        // Update meeting with Google Calendar event ID
        if (meetingId) {
          await supabase
            .from("scheduled_meetings")
            .update({ google_calendar_event_id: createdEvent.id })
            .eq("id", meetingId);
        }

        return new Response(
          JSON.stringify({ success: true, eventId: createdEvent.id, eventLink: createdEvent.htmlLink }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete-event": {
        if (!eventId) {
          throw new Error("Event ID is required");
        }

        const accessToken = await getValidAccessToken(supabase, user.id);
        if (!accessToken) {
          throw new Error("Not connected to Google Calendar");
        }

        const deleteResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const error = await deleteResponse.text();
          console.error("Calendar delete error:", error);
          throw new Error("Failed to delete calendar event");
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    console.error("Error in google-calendar function:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});