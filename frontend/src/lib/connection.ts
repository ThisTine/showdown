import type { ClientMessage, ConnStatus, Profile, RoomState, ServerMessage } from "../types";
import { DEFAULT_DECK } from "./decks";

export interface RoomConnection {
  send(msg: ClientMessage): void;
  close(): void;
}

export interface ConnectionHandlers {
  onState(state: RoomState): void;
  onStatus(status: ConnStatus): void;
}

export interface ConnectionOptions {
  /** View-only (TV display): receives state but never takes a seat. */
  spectator?: boolean;
}

/**
 * In dev there is no Go backend yet, so the app runs a local mock room with
 * bot players. Set VITE_WS=1 to test against a real backend during
 * development. Production builds always use the real WebSocket.
 */
export function createConnection(
  roomId: string,
  playerId: string,
  profile: Profile,
  handlers: ConnectionHandlers,
  options: ConnectionOptions = {},
): RoomConnection {
  const useMock = import.meta.env.DEV && import.meta.env.VITE_WS !== "1";
  if (options.spectator) {
    return useMock
      ? new MockSpectatorConnection(roomId, handlers)
      : new WsConnection(roomId, playerId, profile, handlers, true);
  }
  return useMock
    ? new MockConnection(roomId, playerId, profile, handlers)
    : new WsConnection(roomId, playerId, profile, handlers);
}

/* ------------------------------------------------------------------ */
/* Real WebSocket client — matches PROTOCOL.md for the Go backend.     */
/* ------------------------------------------------------------------ */

class WsConnection implements RoomConnection {
  private ws: WebSocket | null = null;
  private queue: ClientMessage[] = [];
  private closed = false;
  private attempts = 0;

  constructor(
    private roomId: string,
    private playerId: string,
    private profile: Profile,
    private handlers: ConnectionHandlers,
    private spectator = false,
  ) {
    this.connect();
  }

  private connect(): void {
    this.handlers.onStatus("connecting");
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws/room/${encodeURIComponent(this.roomId)}`);
    this.ws = ws;

    ws.onopen = () => {
      this.attempts = 0;
      this.handlers.onStatus("online");
      const hello: ClientMessage = this.spectator
        ? { type: "watch" }
        : { type: "join", playerId: this.playerId, name: this.profile.name, emoji: this.profile.emoji };
      ws.send(JSON.stringify(hello));
      for (const msg of this.queue.splice(0)) {
        ws.send(JSON.stringify(msg));
      }
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as ServerMessage;
        if (msg.type === "state") this.handlers.onState(msg.state);
      } catch {
        /* malformed frame — ignore */
      }
    };

    ws.onclose = () => {
      if (this.closed) return;
      this.handlers.onStatus("offline");
      const backoff = Math.min(10_000, 1_000 * 2 ** this.attempts++);
      setTimeout(() => {
        if (!this.closed) this.connect();
      }, backoff);
    };
  }

  send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.queue.push(msg);
    }
  }

  close(): void {
    this.closed = true;
    this.ws?.close();
  }
}

/* ------------------------------------------------------------------ */
/* Mock room with bot players, for developing the UI without a server. */
/* ------------------------------------------------------------------ */

interface MockPlayer {
  id: string;
  name: string;
  emoji: string;
  vote: string | null;
  bot: boolean;
}

const BOTS: Array<Pick<MockPlayer, "id" | "name" | "emoji">> = [
  { id: "bot-1", name: "Calamity Jane", emoji: "🐴" },
  { id: "bot-2", name: "Doc Holliday", emoji: "🦅" },
  { id: "bot-3", name: "Wild Bill", emoji: "🌵" },
  { id: "bot-4", name: "Annie Oakley", emoji: "⭐" },
];

const channelName = (roomId: string) => `showdown:room:${roomId}`;

class MockConnection implements RoomConnection {
  private deck = [...DEFAULT_DECK];
  private revealed = false;
  private round = 1;
  private players: MockPlayer[] = [];
  private timers = new Set<ReturnType<typeof setTimeout>>();
  /** Index in the deck the bots loosely agree on, re-rolled every round. */
  private botTargetIndex = 0;
  private disposed = false;
  private revealScheduled = false;
  /** Mirrors state to spectator tabs (the TV view) while in demo mode. */
  private channel: BroadcastChannel | null = null;

  constructor(
    private roomId: string,
    playerId: string,
    profile: Profile,
    private handlers: ConnectionHandlers,
    /** Self-running mode for a standalone TV demo: bots only, auto reveal/reset. */
    private autopilot = false,
  ) {
    if (!autopilot && typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(channelName(roomId));
      this.channel.onmessage = (e) => {
        if (e.data?.type === "sync") this.emit();
      };
    }
    if (!autopilot) {
      this.players.push({ id: playerId, name: profile.name, emoji: profile.emoji, vote: null, bot: false });
    }
    this.rollBotTarget();
    handlers.onStatus("demo");
    this.emit();
    const bots = autopilot ? BOTS : BOTS.slice(0, 3);
    bots.forEach((bot, i) => {
      this.after(1200 + i * 1400, () => {
        this.players.push({ ...bot, vote: null, bot: true });
        this.emit();
        this.scheduleBotVote(bot.id);
      });
    });
  }

  send(msg: ClientMessage): void {
    switch (msg.type) {
      case "join":
      case "watch":
        break;
      case "vote": {
        if (this.revealed) break;
        const me = this.players.find((p) => !p.bot);
        if (me) me.vote = msg.value;
        break;
      }
      case "reveal":
        if (this.players.some((p) => p.vote !== null)) this.revealed = true;
        break;
      case "reset":
        this.startNewRound();
        break;
      case "deck":
        this.deck = msg.cards;
        this.startNewRound();
        break;
    }
    this.emit();
  }

  close(): void {
    this.disposed = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.channel?.close();
    this.channel = null;
  }

  private startNewRound(): void {
    this.revealed = false;
    this.revealScheduled = false;
    this.round += 1;
    this.rollBotTarget();
    for (const p of this.players) {
      p.vote = null;
      if (p.bot) this.scheduleBotVote(p.id);
    }
  }

  private rollBotTarget(): void {
    const numericCount = this.deck.filter((c) => Number.isFinite(Number(c))).length || this.deck.length;
    this.botTargetIndex = Math.floor(Math.random() * Math.min(numericCount, this.deck.length));
  }

  private scheduleBotVote(botId: string): void {
    this.after(1500 + Math.random() * 4500, () => {
      const bot = this.players.find((p) => p.id === botId);
      if (!bot || this.revealed || bot.vote !== null) return;
      bot.vote = this.pickBotVote();
      this.emit();
      this.maybeAutopilot();
    });
  }

  /** Standalone TV demo loop: reveal once everyone voted, then start over. */
  private maybeAutopilot(): void {
    if (!this.autopilot || this.revealed || this.revealScheduled) return;
    if (this.players.length < 2 || !this.players.every((p) => p.vote !== null)) return;
    this.revealScheduled = true;
    this.after(1800, () => {
      if (this.revealed) return;
      this.revealed = true;
      this.emit();
      this.after(6000, () => {
        this.startNewRound();
        this.emit();
      });
    });
  }

  private pickBotVote(): string {
    const roll = Math.random();
    let idx = this.botTargetIndex;
    if (roll > 0.9 && this.deck.includes("?")) return "?";
    if (roll > 0.6) idx += Math.random() > 0.5 ? 1 : -1;
    idx = Math.max(0, Math.min(this.deck.length - 1, idx));
    return this.deck[idx];
  }

  private after(ms: number, fn: () => void): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(t);
  }

  private emit(): void {
    const state: RoomState = {
      roomId: this.roomId,
      deck: [...this.deck],
      revealed: this.revealed,
      round: this.round,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        voted: p.vote !== null,
        vote: this.revealed ? p.vote : null,
      })),
    };
    this.handlers.onState(state);
    this.channel?.postMessage({ type: "state", state });
  }
}

/**
 * Spectator in demo mode: mirrors the mock room of an open game tab via
 * BroadcastChannel. If no game tab answers, falls back to a self-running
 * bots-only demo so the TV is never blank.
 */
class MockSpectatorConnection implements RoomConnection {
  private channel: BroadcastChannel | null = null;
  private fallback: MockConnection | null = null;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private hasHost = false;

  constructor(roomId: string, handlers: ConnectionHandlers) {
    handlers.onStatus("connecting");
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(channelName(roomId));
      this.channel.onmessage = (e) => {
        if (e.data?.type !== "state") return;
        this.hasHost = true;
        if (this.fallbackTimer) {
          clearTimeout(this.fallbackTimer);
          this.fallbackTimer = null;
        }
        if (this.fallback) {
          this.fallback.close();
          this.fallback = null;
        }
        handlers.onStatus("demo");
        handlers.onState(e.data.state as RoomState);
      };
      this.channel.postMessage({ type: "sync" });
    }
    this.fallbackTimer = setTimeout(() => {
      if (!this.hasHost) {
        this.fallback = new MockConnection(roomId, "", { name: "", emoji: "" }, handlers, true);
      }
    }, 900);
  }

  send(): void {
    /* view-only */
  }

  close(): void {
    if (this.fallbackTimer) clearTimeout(this.fallbackTimer);
    this.fallback?.close();
    this.channel?.close();
    this.channel = null;
  }
}
