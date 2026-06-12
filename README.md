# Showdown 🃏

Real-time scrum poker for your team. Create a room, share the link, everyone votes — no accounts, no database, no setup. When the tab closes, the player disappears.

**Live demo → [showdown.thistine.com](https://showdown.thistine.com)**

---

## Features

- **Instant rooms** — hit the home page, pick a name and deck, get a shareable link
- **No login** — identity lives in your browser's localStorage (stable across refreshes)
- **Fibonacci, T-Shirt, or custom decks** — change mid-session, resets the round for everyone
- **Anyone can reveal or reset** — no host privilege, no admin
- **TV / big-screen view** — open the 📺 popup, cast it to a display in the meeting room; shows the room code, join URL, and oversized seats. Goes fullscreen with one click
- **Mobile-first card hand** — switches from an overlapping fan to a tappable grid on screens ≤ 700 px
- **Heavy animations** — spring-physics cards, confetti on consensus, staggered reveals
- **No database** — all state lives in RAM; rooms vanish when the last person leaves

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript, Vite 6, Motion (Framer Motion v12) |
| Backend | Rust, axum 0.8, tokio |
| Transport | WebSockets (JSON snapshots) |
| Deploy | Single Docker image (binary + static files) |

---

## Quick start (Docker)

The easiest way — one command, no Node or Rust required:

```sh
git clone https://github.com/ThisTine/showdown.git
cd showdown
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

---

## Local development

You need **Node 22+** and **Rust 1.80+**.

### 1. Frontend (dev server with mock bots — no backend needed)

```sh
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The app runs in **demo mode**: three western bots join, think, and vote automatically. Every animation, card flip, confetti burst, and deck-edit flow works without a backend. You'll see a `demo` chip in the top bar.

### 2. Backend

```sh
cd backend
cargo run            # http://localhost:8080
```

### 3. Frontend talking to the local backend

```sh
cd frontend
VITE_WS=1 npm run dev
```

Vite proxies `/ws` → `localhost:8080`. The `demo` chip disappears and you're on the real WebSocket.

### 4. Production build (what Docker does)

```sh
cd frontend && npm run build    # → frontend/dist/
cd ../backend && cargo run      # serves /ws + frontend/dist on :8080
```

---

## Project layout

```
showdown/
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── connection.ts   WsConnection (prod) + MockConnection (dev bots)
│   │   │   ├── session.ts      localStorage profile, stable playerId, room-id words
│   │   │   ├── decks.ts        deck presets + custom deck parser
│   │   │   └── router.ts       30-line history router
│   │   ├── pages/
│   │   │   ├── Home.tsx        create room: name, avatar, deck
│   │   │   ├── Room.tsx        the game: table, hand, deck modal, confetti
│   │   │   └── Tv.tsx          big-screen spectator view
│   │   ├── components/         Table, PlayerSeat, Cards, CardHand, Results,
│   │   │                       Confetti, ProfileForm, DeckModal, Logo
│   │   └── index.css           full "toy poker table" design system
│   └── vite.config.ts
├── backend/
│   └── src/
│       ├── main.rs             axum router + static-file SPA fallback
│       ├── room.rs             game rules: vote / reveal / reset / deck
│       └── ws.rs               socket lifecycle: hello → select loop → cleanup
├── PROTOCOL.md                 full wire protocol spec (client ↔ server)
├── Dockerfile                  3-stage build: Node → Rust → alpine runtime
└── docker-compose.yml
```

---

## Wire protocol

See [`PROTOCOL.md`](./PROTOCOL.md) for the full spec. Short version:

- One WebSocket per player at `GET /ws/room/{roomId}`
- First frame is always `{ "type": "join", ... }` (or `"watch"` for the TV view)
- Every change triggers one full-state JSON snapshot broadcast to the whole room
- Votes are hidden in snapshots until `revealed: true` — only `voted: true/false` leaks before the showdown

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port the server listens on |
| `STATIC_DIR` | `../frontend/dist` | Path to the built frontend files |

---

## Self-hosting

The Docker image is a single alpine container (~15 MB). Drop it behind any reverse proxy that supports WebSocket upgrades.

**nginx example** (the only non-obvious part is `proxy_read_timeout` — keep-alive pings are 30 s, so set it higher):

```nginx
server {
    listen 443 ssl;
    server_name showdown.example.com;

    location / {
        proxy_pass         http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_read_timeout 120s;
    }
}
```

**Fly.io / Railway / Render** — point them at the `Dockerfile` in the repo root, set `PORT` to whatever the platform expects, done.

---

## How "no database" works

A `Room` is a Rust struct — a deck, a `revealed` flag, a round counter, and a `Vec` of players. All rooms sit in one `Mutex<HashMap<roomId, Room>>` in RAM. When a socket closes, that player is removed. When the last socket of a room closes, the room is deleted from the map. Restart the server and everything is gone — which is the point.

Player identity is a UUID generated by the browser and stored in `localStorage`. A reconnect (page refresh) with the same UUID reclaims the seat and keeps the vote; the server uses a per-connection counter to tell a refresh from a genuine disconnect.

---

## License

MIT
