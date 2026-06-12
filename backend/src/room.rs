//! Room state and rules. Everything lives in one `Mutex<HashMap>` — a room
//! is a few hundred bytes and is dropped the moment its last socket closes.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

pub type Rooms = Arc<Mutex<HashMap<String, Room>>>;

pub const DEFAULT_DECK: &[&str] = &["0", "1", "2", "3", "5", "8", "13", "21", "34", "?", "☕"];
const MAX_DECK_CARDS: usize = 15;
const MAX_CARD_CHARS: usize = 4;

/// Everything a client may send. The first frame must be `join` or `watch`;
/// the rest only make sense from a seated player.
#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ClientMessage {
    Join {
        #[serde(rename = "playerId")]
        player_id: String,
        name: String,
        emoji: String,
    },
    Watch,
    Vote { value: Option<String> },
    Reveal,
    Reset,
    Deck { cards: Vec<String> },
}

pub struct Player {
    pub id: String,
    pub name: String,
    pub emoji: String,
    pub vote: Option<String>,
    /// Newest socket claiming this seat. A refresh re-joins with the same
    /// player id and takes over the seat (keeping the vote); the old socket's
    /// disconnect then sees a newer `conn` and leaves the seat alone.
    pub conn: u64,
}

pub struct Room {
    pub deck: Vec<String>,
    pub revealed: bool,
    pub round: u64,
    /// Join order is seat order, and scrum teams are small — a Vec beats a map.
    pub players: Vec<Player>,
    /// Open sockets, players and watchers alike. Zero means delete the room.
    pub conns: usize,
    /// Every state change is serialized once and fanned out through here.
    pub tx: broadcast::Sender<String>,
}

impl Room {
    pub fn new() -> Self {
        Self {
            deck: DEFAULT_DECK.iter().map(|c| c.to_string()).collect(),
            revealed: false,
            round: 1,
            players: Vec::new(),
            conns: 0,
            tx: broadcast::channel(32).0,
        }
    }

    pub fn join(&mut self, id: &str, name: &str, emoji: &str, conn: u64) {
        match self.players.iter_mut().find(|p| p.id == id) {
            Some(p) => {
                p.name = name.to_string();
                p.emoji = emoji.to_string();
                p.conn = conn;
            }
            None => self.players.push(Player {
                id: id.to_string(),
                name: name.to_string(),
                emoji: emoji.to_string(),
                vote: None,
                conn,
            }),
        }
    }

    /// Free the seat unless a newer socket (a refresh) already re-claimed it.
    /// Returns whether the player list actually changed.
    pub fn leave(&mut self, id: &str, conn: u64) -> bool {
        match self.players.iter().position(|p| p.id == id && p.conn == conn) {
            Some(pos) => {
                self.players.remove(pos);
                true
            }
            None => false,
        }
    }

    pub fn apply(&mut self, player_id: &str, msg: ClientMessage) {
        match msg {
            ClientMessage::Vote { value } => {
                if self.revealed {
                    return; // no changing your story after the showdown
                }
                if let Some(v) = &value {
                    if !self.deck.contains(v) {
                        return;
                    }
                }
                if let Some(p) = self.players.iter_mut().find(|p| p.id == player_id) {
                    p.vote = value;
                }
            }
            ClientMessage::Reveal => {
                if self.players.iter().any(|p| p.vote.is_some()) {
                    self.revealed = true;
                }
            }
            ClientMessage::Reset => self.new_round(),
            ClientMessage::Deck { cards } => {
                if let Some(deck) = clean_deck(cards) {
                    self.deck = deck;
                    self.new_round();
                }
            }
            // join/watch are handshake messages, meaningless mid-session.
            ClientMessage::Join { .. } | ClientMessage::Watch => {}
        }
    }

    fn new_round(&mut self) {
        self.revealed = false;
        self.round += 1;
        for p in &mut self.players {
            p.vote = None;
        }
    }

    /// One JSON snapshot of the room. Votes stay hidden until the reveal —
    /// only `voted` leaks beforehand. Serializes from borrows; no clones.
    pub fn snapshot_json(&self, room_id: &str) -> String {
        #[derive(Serialize)]
        struct PlayerOut<'a> {
            id: &'a str,
            name: &'a str,
            emoji: &'a str,
            voted: bool,
            vote: Option<&'a str>,
        }

        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Snapshot<'a> {
            room_id: &'a str,
            deck: &'a [String],
            revealed: bool,
            round: u64,
            players: Vec<PlayerOut<'a>>,
        }

        #[derive(Serialize)]
        struct StateMsg<'a> {
            r#type: &'static str,
            state: Snapshot<'a>,
        }

        let players = self
            .players
            .iter()
            .map(|p| PlayerOut {
                id: &p.id,
                name: &p.name,
                emoji: &p.emoji,
                voted: p.vote.is_some(),
                vote: if self.revealed { p.vote.as_deref() } else { None },
            })
            .collect();

        serde_json::to_string(&StateMsg {
            r#type: "state",
            state: Snapshot {
                room_id,
                deck: &self.deck,
                revealed: self.revealed,
                round: self.round,
                players,
            },
        })
        .expect("room state always serializes")
    }

    pub fn broadcast(&self, room_id: &str) {
        // Send fails only when nobody is listening, which is fine.
        let _ = self.tx.send(self.snapshot_json(room_id));
    }
}

/// Trim, dedupe and cap a proposed deck. None if fewer than two cards survive.
fn clean_deck(cards: Vec<String>) -> Option<Vec<String>> {
    let mut out: Vec<String> = Vec::new();
    for raw in cards {
        let card = raw.trim();
        if card.is_empty() || card.chars().count() > MAX_CARD_CHARS {
            continue;
        }
        if out.iter().any(|c| c == card) {
            continue;
        }
        out.push(card.to_string());
        if out.len() == MAX_DECK_CARDS {
            break;
        }
    }
    (out.len() >= 2).then_some(out)
}
