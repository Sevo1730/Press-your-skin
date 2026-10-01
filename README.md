# press-your-luck-stream

An interactive "Press Your Luck"-style mini-game for stream viewers.
A Discord bot picks 3 viewers, DMs each a private controller link, and they press
**Space** to stop a spinning 18-cell board that your audience watches in OBS.

No database. All game state is ephemeral and travels over Supabase Realtime
Broadcast. Prize labels are just text the streamer types — there is no wagering,
no real-money prize, no gambling mechanic anywhere in this project.

## Pages

| Route | Who opens it | What it does |
|---|---|---|
| `/admin` | the streamer | enter 18 prizes, push them to the board, set player names, hand out the turn, start the spin, bump the round counter |
| `/board` | OBS Browser Source | the public board — 18-cell ring, centre box, spin animation |
| `/play/<token>` | a picked viewer | one big **PRESS SPACE TO STOP** button, live only on their turn |

## Setup

### 1. Supabase

Create a free project. You only need Realtime — **no tables, no SQL, no auth.**
Copy the project URL and the `anon` public key from *Project Settings → API*.

### 2. Discord bot

Create an application at <https://discord.com/developers/applications>, add a Bot,
and enable the **Message Content Intent** under *Bot → Privileged Gateway Intents*.
Invite it to your server with the *Send Messages*, *Read Message History* and
*Add Reactions* permissions. Copy the bot token and the ID of the channel viewers
will type `!join` in (right-click the channel → Copy Channel ID, with Developer
Mode on).

### 3. Environment

```bash
cp .env.example .env.local   # used by Next.js
cp .env.example .env         # used by the bot
```

| Var | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | app | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app | anon public key |
| `NEXT_PUBLIC_ROOM` | app | optional broadcast channel name, default `pyl-room` |
| `BOT_SECRET` | app + bot | any long random string; the bot sends it as `x-bot-secret` when registering player tokens |
| `DISCORD_TOKEN` | bot | bot token |
| `DISCORD_CHANNEL_ID` | bot | channel the bot listens in |
| `APP_URL` | bot | where the app is reachable, e.g. `http://localhost:3000` or your deployed URL. No trailing slash — it is what gets DM'd to players. |

### 4. Run

```bash
npm install
npm run dev          # Next.js app on http://localhost:3000
npm run bot          # the Discord bot, in a second terminal
npm run test:logic   # self-check for lib/gameLogic.ts
```

The bot calls the app's `/api/tokens` route, so start the app first (or at least
before the first `!pick`).

## Running a round

1. Viewers type `!join` in the configured channel. `!pool` lists who's in.
2. You (anyone with **Manage Server**) type `!pick @a @b @c`. Each gets a DM with
   their private `/play/<token>` link; the pool clears.
3. In `/admin`, type the three names into P1/P2/P3 and hit **Give turn** on one.
4. Hit **Start spin**. The active player presses Space (or taps the button).
   The board settles over a few decelerating jumps and lands.
5. **Give turn** to the next player and spin again. **Next round** bumps the counter.

If a player goes AFK mid-spin, **Force stop** in `/admin` lands it for them.

## OBS setup

1. *Sources → + → Browser*.
2. URL: `http://localhost:3000/board` (or your deployed URL).
3. Width **1280**, Height **720** — the board keeps a 6:5 aspect ratio and scales
   to whatever you give it.
4. Tick **Shutdown source when not visible** and **Refresh browser when scene
   becomes active** so a scene switch always rejoins the channel cleanly.
5. Want the board over your gameplay with no background? Use
   `http://localhost:3000/board?transparent=1` — the page background goes
   transparent and OBS composites it directly.

The centre box has a faint **CAM ON** button: it shows your webcam (mirrored)
behind the active player's name via `getUserMedia`. Note that OBS's browser source
has its own camera permission — it's mostly useful when you open `/board` in a real
browser and capture the window instead.

## How the sync works

One Supabase Realtime Broadcast channel, five events:
`BOARD_UPDATE`, `TURN_CHANGE`, `SPIN_START`, `SPIN_STOP`, `HELLO`.

The spin is **not** streamed cell-by-cell. A step lands every 45–110ms, which is
9–22 messages/sec — straight into Supabase's default 10 msg/sec client limit, and
any dropped message would desync the board from the player. Instead `SPIN_START`
carries a random seed, and every client builds the identical jump path from it
with a tiny seeded PRNG. When the player hits Space, their page broadcasts
`SPIN_STOP { seed, step }` — the step they were on — and all clients replay the
same seeded settle sequence from there. Two messages per spin, one landing cell
everywhere. See the comment at the top of [`lib/gameLogic.ts`](lib/gameLogic.ts).

`HELLO` is how a late joiner recovers: when `/board` subscribes (e.g. OBS reloaded
it mid-game) it says HELLO, and `/admin` re-pushes the prizes and current turn.

## Deploying

Player tokens live in memory in the Next.js process (`lib/tokenStore.ts`), so run
the app as **one** long-lived Node server — Railway, Fly, Render, a VPS, `npm run
build && npm start`. On a scale-to-many serverless platform a token registered by
one instance won't be found by another. Swapping that Map for Redis or a Supabase
table is the only change needed if you outgrow it.

## Layout notes

The board is a 6×5 CSS grid. Cells 0–17 run clockwise from the top-left: 6 across
the top, 3 down the right, 6 back along the bottom, 3 up the left. The centre box
spans columns 2–5, rows 2–4. All decoration is CSS gradients and emoji — no image
assets and no copyrighted character art.
