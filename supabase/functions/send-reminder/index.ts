import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Minimal CORS headers for cron job (not browser-accessible)
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://supabase.co",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email validation regex
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret to prevent unauthorized access
    const cronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");
    
    if (!cronSecret) {
      console.error("CRON_SECRET is not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn("Unauthorized attempt to call send-reminder function");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get meetings happening in the next 15 minutes that haven't had reminders sent
    const fifteenMinutesFromNow = new Date(Date.now() + 15 * 60 * 1000);
    const now = new Date();

    const { data: upcomingMeetings, error: meetingsError } = await supabase
      .from("scheduled_meetings")
      .select(`
        *,
        profiles:host_id (email, full_name),
        meeting_participants (email, name, reminder_sent)
      `)
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", fifteenMinutesFromNow.toISOString())
      .eq("reminder_sent", false);

    if (meetingsError) {
      console.error("Error fetching meetings:", meetingsError);
      throw meetingsError;
    }

    console.log(`Found ${upcomingMeetings?.length || 0} upcoming meetings to send reminders for`);

    const results = [];

    for (const meeting of upcomingMeetings || []) {
      const meetingTime = new Date(meeting.scheduled_at).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });

      // Send reminder to host (validate email first)
      if (meeting.profiles?.email && isValidEmail(meeting.profiles.email)) {
        try {
          await resend.emails.send({
            from: "MeetFlow <onboarding@resend.dev>",
            to: [meeting.profiles.email],
            subject: `Reminder: "${meeting.title}" starts in 15 minutes`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Meeting Reminder</h2>
                <p>Hi ${meeting.profiles.full_name || "there"},</p>
                <p>Your meeting "<strong>${meeting.title}</strong>" is starting soon!</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Time:</strong> ${meetingTime}</p>
                  <p style="margin: 10px 0 0 0;"><strong>Duration:</strong> ${meeting.duration_minutes} minutes</p>
                </div>
                <a href="${meeting.meeting_link}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Join Meeting</a>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">— The MeetFlow Team</p>
              </div>
            `,
          });
          console.log(`Sent reminder to host: ${meeting.profiles.email}`);
        } catch (emailError) {
          console.error(`Failed to send email to host ${meeting.profiles.email}:`, emailError);
        }

        // Create in-app notification for host
        await supabase.from("notifications").insert({
          user_id: meeting.host_id,
          title: "Meeting starting soon",
          message: `Your meeting "${meeting.title}" starts in 15 minutes`,
          type: "reminder",
          meeting_id: meeting.id,
        });
      } else if (meeting.profiles?.email) {
        console.warn(`Invalid host email format, skipping: ${meeting.profiles.email}`);
      }

      // Send reminders to participants (validate emails first)
      for (const participant of meeting.meeting_participants || []) {
        if (!participant.reminder_sent && participant.email) {
          // Validate email format before sending
          if (!isValidEmail(participant.email)) {
            console.warn(`Invalid participant email format, skipping: ${participant.email}`);
            continue;
          }

          try {
            await resend.emails.send({
              from: "MeetFlow <onboarding@resend.dev>",
              to: [participant.email],
              subject: `Reminder: "${meeting.title}" starts in 15 minutes`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Meeting Reminder</h2>
                  <p>Hi ${participant.name || "there"},</p>
                  <p>You're invited to "<strong>${meeting.title}</strong>" which is starting soon!</p>
                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Time:</strong> ${meetingTime}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Duration:</strong> ${meeting.duration_minutes} minutes</p>
                    <p style="margin: 10px 0 0 0;"><strong>Host:</strong> ${meeting.profiles?.full_name || "Unknown"}</p>
                  </div>
                  <a href="${meeting.meeting_link}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Join Meeting</a>
                  <p style="color: #666; font-size: 14px; margin-top: 30px;">— The MeetFlow Team</p>
                </div>
              `,
            });
            console.log(`Sent reminder to participant: ${participant.email}`);

            // Mark participant reminder as sent
            await supabase
              .from("meeting_participants")
              .update({ reminder_sent: true })
              .eq("email", participant.email)
              .eq("meeting_id", meeting.id);
          } catch (emailError) {
            console.error(`Failed to send email to participant ${participant.email}:`, emailError);
          }
        }
      }

      // Mark meeting reminder as sent
      await supabase
        .from("scheduled_meetings")
        .update({ reminder_sent: true })
        .eq("id", meeting.id);

      results.push({ meetingId: meeting.id, title: meeting.title, status: "sent" });
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-reminder function:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});