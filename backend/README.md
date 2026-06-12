# Showdown backend

Rust (axum + tokio). Implements `../PROTOCOL.md`: WebSocket rooms that live
entirely in memory and a static file server for the built frontend — the whole
app is one binary plus a `dist/` folder.

## Run it

```sh
# build the frontend first so there is something to serve
cd ../frontend && npm run build && cd ../backend

cargo run            # http://localhost:8080
```

- `PORT` — listen port (default `8080`)
- `STATIC_DIR` — built frontend location (default `../frontend/dist`)

During frontend development you can instead run `npm run dev` with
`VITE_WS=1` and Vite proxies `/ws` here.

## How it stays small

- **No database, by design.** A `Room` is a deck, a `revealed` flag, a round
  counter and a `Vec` of players — a few hundred bytes. All rooms sit in one
  `Mutex<HashMap>`. When the last socket of a room closes, the room is
  removed; restart the server and everything is gone, which is the point.
- **One task per socket, nothing else.** Each connection is a single
  `tokio::select!` loop (snapshots out, messages in, a 30s keepalive ping).
  No per-room goroutine-style actors, no background jobs, no timers per room.
- **Snapshots are serialized once per change** (borrowed data, no clones) and
  fanned out through a per-room `broadcast` channel with a small buffer.

## Files

```
src/main.rs   routes + static serving with SPA fallback (~40 lines)
src/room.rs   room state and the game rules (vote/reveal/reset/deck)
src/ws.rs     socket lifecycle: hello → select loop → disconnect cleanup
```

Rules enforced here (mirroring PROTOCOL.md): votes are hidden until reveal
and rejected after it; reveal needs at least one vote; reset/deck-change
start a fresh round; a refresh re-claims the same seat without losing the
vote; watchers (`watch` handshake — the TV view) receive everything and may
send nothing.
