/**
 * Shared shapes for the Showdown room protocol.
 * The Go backend mirrors these — see PROTOCOL.md at the repo root.
 */

export interface Player {
  id: string;
  name: string;
  emoji: string;
  /** True once the player has picked a card this round. */
  voted: boolean;
  /** The actual card. Null until the round is revealed (server hides it). */
  vote: string | null;
}

export interface RoomState {
  roomId: string;
  deck: string[];
  revealed: boolean;
  /** Increments on every reset / deck change. Lets clients detect new rounds. */
  round: number;
  players: Player[];
}

export type ClientMessage =
  | { type: "join"; playerId: string; name: string; emoji: string }
  | { type: "watch" }
  | { type: "vote"; value: string | null }
  | { type: "reveal" }
  | { type: "reset" }
  | { type: "deck"; cards: string[] };

export type ServerMessage = { type: "state"; state: RoomState };

export type ConnStatus = "connecting" | "online" | "offline" | "demo";

export interface Profile {
  name: string;
  emoji: string;
}
