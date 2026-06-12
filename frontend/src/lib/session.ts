import type { Profile } from "../types";

const PROFILE_KEY = "showdown:profile";
const PLAYER_ID_KEY = "showdown:pid";
const PENDING_DECK_KEY = "showdown:pendingDeck";

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.name === "string" && typeof p?.emoji === "string" && p.name) {
      return { name: p.name, emoji: p.emoji };
    }
  } catch {
    /* corrupted storage — treat as signed out */
  }
  return null;
}

export function saveProfile(p: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

/** Stable per-browser identity so a refresh re-claims the same seat. */
export function getPlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

/** The deck chosen on the home page, applied right after the room creator joins. */
export function stashPendingDeck(cards: string[]): void {
  sessionStorage.setItem(PENDING_DECK_KEY, JSON.stringify(cards));
}

export function takePendingDeck(): string[] | null {
  const raw = sessionStorage.getItem(PENDING_DECK_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_DECK_KEY);
  try {
    const cards = JSON.parse(raw);
    if (Array.isArray(cards) && cards.every((c) => typeof c === "string")) {
      return cards;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const ADJECTIVES = ["dusty", "rowdy", "lucky", "sneaky", "golden", "wild", "lone", "rusty", "swift", "fancy"];
const NOUNS = ["cactus", "saloon", "wagon", "sheriff", "coyote", "mustang", "nugget", "lasso", "spur", "tumbleweed"];

export function generateRoomId(): string {
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  const num = String(Math.floor(Math.random() * 90) + 10);
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${num}`;
}
