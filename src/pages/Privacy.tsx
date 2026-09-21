import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
      <h1 className="text-3xl font-bold">Privacy</h1>
      <p className="text-muted-foreground">
        Account data (email, name, scheduled meetings, calendar tokens) is stored in your
        Supabase project. Google Calendar tokens are used only to create, update, or delete
        events you request. Meeting media is not uploaded to MeetFlow servers; it travels
        peer-to-peer when WebRTC connects.
      </p>
      <p className="text-muted-foreground">
        Local recordings stay on your device. Email reminders are sent through the configured
        transactional email provider when a reminder job runs.
      </p>
      <Link to="/" className="text-primary underline">Back home</Link>
    </main>
  );
}
