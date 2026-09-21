# MeetFlow

Video meetings with a waiting room, chat, reactions, and screen share, plus authenticated scheduling with Google Calendar. Built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

Instant meetings use WebRTC mesh signaling over Supabase Realtime. Media is DTLS-SRTP between browsers. Host actions go through the `meeting-room` function (hashed host token or signed-in scheduled host). Invite links never include host privileges. Restrictive NATs may still fail without a TURN server you operate yourself (do not put TURN passwords in `VITE_` variables).

## Setup

```sh
npm install
cp .env.example .env
npm run dev
```

Client `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Edge function secrets (Supabase dashboard):

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `SITE_URL` (production origin, no trailing slash)
- `RESEND_API_KEY` (and optional `RESEND_FROM`)
- `CRON_SECRET` for `send-reminder`

Apply every file in `supabase/migrations/` to your project. Deploy `meeting-room`, `google-calendar`, `send-invite`, and `send-reminder`. Room state is read through `meeting-room` (`get`); the `meeting_rooms` table is not exposed to the browser client.

Schedule `send-reminder` every 5 minutes with header `Authorization: Bearer <CRON_SECRET>`.

If `.env` was ever committed, rotate those keys. History still contains them until you rewrite git history.

## Deploy for live users

1. Push this repo to GitHub (do not commit `.env` or `supabase/.temp/`).
2. Host the frontend (Vercel, Netlify, or similar) with build command `npm run build` and output `dist`. Set:
   - `VITE_SUPABASE_URL=https://owamowtnemtlyhsctlkj.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (publishable or anon key only)
3. In Supabase **Edge Function secrets**, set `SITE_URL` to the public origin with no trailing slash (for example `https://your-app.vercel.app`). Local CORS still allows localhost / LAN ports 8080, 5173, and 3000.
4. In **Authentication → URL configuration**, set Site URL to that origin and add redirect URLs:
   - `https://your-origin/auth`
   - `https://your-origin/reset-password`
   - `https://your-origin/calendar-callback`
5. Optional: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`.

`vercel.json` is included so a Vercel SPA deploy rewrites client routes to `index.html`.

## Scripts

- `npm run dev` — local server (port 8080)
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm test` — unit tests
- `npm run lint` — ESLint
