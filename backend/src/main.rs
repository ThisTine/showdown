//! Showdown backend: WebSocket rooms held entirely in memory, plus static
//! file serving for the built frontend. No database — a room lives exactly
//! as long as someone has it open. See ../PROTOCOL.md for the wire format.

mod room;
mod ws;

use std::env;
use std::path::PathBuf;

use axum::routing::get;
use axum::Router;
use tower_http::services::{ServeDir, ServeFile};

use crate::room::Rooms;

#[tokio::main]
async fn main() {
    let rooms = Rooms::default();

    let static_dir =
        PathBuf::from(env::var("STATIC_DIR").unwrap_or_else(|_| "../frontend/dist".into()));
    // Unknown paths fall back to index.html so deep links like /room/abc work.
    let spa = ServeDir::new(&static_dir).fallback(ServeFile::new(static_dir.join("index.html")));

    let app = Router::new()
        .route("/ws/room/{room_id}", get(ws::ws_handler))
        .fallback_service(spa)
        .with_state(rooms);

    let port: u16 = env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8080);
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port))
        .await
        .expect("failed to bind port");

    println!("🤠 Showdown saloon open at http://localhost:{port}");
    println!("   serving frontend from {}", static_dir.display());
    axum::serve(listener, app).await.expect("server error");
}
