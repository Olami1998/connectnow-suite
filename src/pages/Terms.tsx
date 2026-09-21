import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
      <h1 className="text-3xl font-bold">Terms of service</h1>
      <p className="text-muted-foreground">
        MeetFlow is provided as-is for scheduling and peer-to-peer video meetings. Do not use it
        for unlawful activity. You are responsible for content you share in a room and for
        obtaining consent before recording.
      </p>
      <p className="text-muted-foreground">
        Media is sent with WebRTC (DTLS-SRTP) between browsers when the network allows. There is
        no dedicated media server in this app, so connectivity can fail on restrictive NATs
        without a TURN server.
      </p>
      <Link to="/" className="text-primary underline">Back home</Link>
    </main>
  );
}
