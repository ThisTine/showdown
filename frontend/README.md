# Showdown frontend

Game-like scrum poker. React + TypeScript + Vite, with the
[Motion](https://motion.dev) library for spring-physics animation.

## Run it

```sh
npm install
npm run dev
```

In dev there is no backend yet, so the app runs in **demo mode**: a local mock
room where three western bots join, think, and vote — every animation and flow
(deal-in, card flips, consensus confetti, deck editing) is exercisable solo.
You'll see a `demo` chip in the top bar.

- `VITE_WS=1 npm run dev` — talk to a real backend on `localhost:8080`
  (the Vite proxy forwards `/ws`) instead of the mock.
- `npm run build` — typecheck + production build to `dist/`. Production builds
  always use the real WebSocket at `/ws/room/{id}` on the same host.

## TV display

The 📺 button in a room pops up `/room/{id}/tv` — a view-only big-screen
spectator display (cast it to a TV): giant room code and join URL, oversized
seats and cards, no controls, plus a fullscreen toggle. It connects as a
`watch` socket in production; in demo mode it mirrors your game tab over a
BroadcastChannel (or runs a self-playing bot loop if no game tab is open).

## Mobile

On screens ≤700px the hand switches from the overlapping fan to a flat
wrapped grid of full-size cards (~60–84px wide), so every card is a
comfortable tap target.

## Layout

```
src/
  lib/connection.ts   WsConnection (real, reconnecting) + MockConnection (bots)
  lib/session.ts      localStorage profile + stable playerId + room id words
  lib/decks.ts        presets + custom deck parsing
  lib/router.ts       30-line history router (/ and /room/:id)
  pages/Home.tsx      create room: name, avatar, deck choice
  pages/Room.tsx      the game: top bar, table, hand, deck modal, confetti
  components/         Table, PlayerSeat, Cards (face/back/flip), CardHand,
                      Results, Confetti, ProfileForm, DeckModal, Logo
  index.css           the whole "toy poker table" design system
```

The wire protocol the mock implements is the same one the Rust backend in
`../backend` speaks — see `../PROTOCOL.md`.
