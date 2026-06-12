//! One async task per socket. The task introduces itself (join/watch), then
//! sits in a single select loop: room snapshots out, client messages in.
//! Disconnect cleanup is what makes presence work — closing the tab is
//! leaving the room.

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use tokio::sync::broadcast;
use tokio::sync::broadcast::error::RecvError;

use crate::room::{ClientMessage, Room, Rooms};

/// Distinguishes the sockets of a player who refreshed; see `Player::conn`.
static NEXT_CONN: AtomicU64 = AtomicU64::new(1);

const HELLO_TIMEOUT: Duration = Duration::from_secs(10);
const PING_INTERVAL: Duration = Duration::from_secs(30);

enum Seat {
    Player { id: String },
    Watcher,
}

pub async fn ws_handler(
    Path(room_id): Path<String>,
    State(rooms): State<Rooms>,
    ws: WebSocketUpgrade,
) -> Response {
    if !valid_room_id(&room_id) {
        return (StatusCode::BAD_REQUEST, "bad room id").into_response();
    }
    ws.on_upgrade(move |socket| handle_socket(socket, room_id, rooms))
}

fn valid_room_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

async fn handle_socket(mut socket: WebSocket, room_id: String, rooms: Rooms) {
    // 1. The first frame must introduce the socket: join (player) or watch (TV).
    let hello = match tokio::time::timeout(HELLO_TIMEOUT, socket.recv()).await {
        Ok(Some(Ok(Message::Text(text)))) => text,
        _ => return,
    };
    let seat = match serde_json::from_str::<ClientMessage>(&hello) {
        Ok(ClientMessage::Join { player_id, name, emoji }) => {
            if player_id.is_empty() || player_id.len() > 64 {
                return;
            }
            let conn_id = NEXT_CONN.fetch_add(1, Ordering::Relaxed);
            register_player(
                &rooms,
                &room_id,
                &player_id,
                &clean_text(&name, 16, "Outlaw"),
                &clean_text(&emoji, 8, "🤠"),
                conn_id,
            );
            (Seat::Player { id: player_id }, conn_id)
        }
        Ok(ClientMessage::Watch) => {
            let conn_id = NEXT_CONN.fetch_add(1, Ordering::Relaxed);
            register_watcher(&rooms, &room_id, conn_id);
            (Seat::Watcher, conn_id)
        }
        _ => return,
    };
    let (seat, conn_id) = seat;

    // 2. Subscribe to snapshots and send this socket the current one.
    let (mut rx, snapshot) = {
        let mut map = rooms.lock().unwrap();
        let room = map.get_mut(&room_id).expect("registered above");
        (room.tx.subscribe(), room.snapshot_json(&room_id))
    };

    // 3. The whole session is one loop; whenever it ends, fall through to cleanup.
    serve(&mut socket, &room_id, &rooms, &seat, &mut rx, snapshot).await;

    // 4. Disconnect: free the seat, tell the others, drop the room if empty.
    cleanup(&rooms, &room_id, &seat, conn_id);
}

fn register_player(rooms: &Rooms, room_id: &str, id: &str, name: &str, emoji: &str, conn: u64) {
    let mut map = rooms.lock().unwrap();
    let room = map.entry(room_id.to_string()).or_insert_with(Room::new);
    room.conns += 1;
    room.join(id, name, emoji, conn);
    room.broadcast(room_id);
}

fn register_watcher(rooms: &Rooms, room_id: &str, _conn: u64) {
    let mut map = rooms.lock().unwrap();
    let room = map.entry(room_id.to_string()).or_insert_with(Room::new);
    room.conns += 1;
}

async fn serve(
    socket: &mut WebSocket,
    room_id: &str,
    rooms: &Rooms,
    seat: &Seat,
    rx: &mut broadcast::Receiver<String>,
    first_snapshot: String,
) {
    if socket.send(Message::Text(first_snapshot.into())).await.is_err() {
        return;
    }
    let mut ping = tokio::time::interval(PING_INTERVAL);
    ping.tick().await; // the first tick is immediate; skip it

    loop {
        tokio::select! {
            // A state change somewhere in the room — relay the snapshot.
            update = rx.recv() => {
                let json = match update {
                    Ok(json) => json,
                    // This socket fell behind; skip straight to the freshest state.
                    Err(RecvError::Lagged(_)) => match current_snapshot(rooms, room_id) {
                        Some(json) => json,
                        None => return,
                    },
                    Err(RecvError::Closed) => return,
                };
                if socket.send(Message::Text(json.into())).await.is_err() {
                    return;
                }
            }

            // A frame from this client.
            frame = socket.recv() => {
                let text = match frame {
                    Some(Ok(Message::Text(text))) => text,
                    Some(Ok(_)) => continue, // pongs etc. — ignore
                    _ => return,             // closed or errored
                };
                let Seat::Player { id } = seat else {
                    continue; // watchers are read-only
                };
                let Ok(msg) = serde_json::from_str::<ClientMessage>(&text) else {
                    continue; // malformed frame — ignore
                };
                let mut map = rooms.lock().unwrap();
                if let Some(room) = map.get_mut(room_id) {
                    room.apply(id, msg);
                    room.broadcast(room_id);
                }
            }

            // Keepalive so idle rooms survive proxies and NAT timeouts.
            _ = ping.tick() => {
                if socket.send(Message::Ping(Default::default())).await.is_err() {
                    return;
                }
            }
        }
    }
}

fn current_snapshot(rooms: &Rooms, room_id: &str) -> Option<String> {
    rooms.lock().unwrap().get(room_id).map(|r| r.snapshot_json(room_id))
}

fn cleanup(rooms: &Rooms, room_id: &str, seat: &Seat, conn_id: u64) {
    let mut map = rooms.lock().unwrap();
    let Some(room) = map.get_mut(room_id) else {
        return;
    };
    room.conns -= 1;
    if room.conns == 0 {
        // Last one out: the whole room vanishes. No database, no leftovers.
        map.remove(room_id);
        return;
    }
    if let Seat::Player { id } = seat {
        if room.leave(id, conn_id) {
            room.broadcast(room_id);
        }
    }
}

fn clean_text(raw: &str, max_chars: usize, fallback: &str) -> String {
    let trimmed: String = raw.trim().chars().take(max_chars).collect();
    if trimmed.is_empty() {
        fallback.to_string()
    } else {
        trimmed
    }
}
