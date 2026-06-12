import type { RoomState } from "../types";

export function isConsensus(state: RoomState | null): boolean {
  if (!state?.revealed) return false;
  const votes = state.players.map((p) => p.vote).filter((v): v is string => v !== null);
  return votes.length >= 2 && votes.every((v) => v === votes[0]);
}
