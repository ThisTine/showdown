import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { RoomState } from "../types";
import { PlayerSeat } from "./PlayerSeat";
import { Results } from "./Results";

interface TableProps {
  state: RoomState;
  playerId: string;
  consensus: boolean;
  copied?: boolean;
  /** View-only (TV display): no reveal/reset/invite controls. */
  spectator?: boolean;
  onReveal?(): void;
  onReset?(): void;
  onInvite?(): void;
}

export function Table({ state, playerId, consensus, copied, spectator, onReveal, onReset, onInvite }: TableProps) {
  // Rotate the seating order so the local player always sits at the bottom.
  const ordered = useMemo(() => {
    const idx = state.players.findIndex((p) => p.id === playerId);
    if (idx <= 0) return state.players;
    return [...state.players.slice(idx), ...state.players.slice(0, idx)];
  }, [state.players, playerId]);

  // TV seats are much larger, so they sit on a tighter ring to stay on screen.
  const rx = spectator ? 41 : 44;
  const ry = spectator ? 38 : 43;
  const n = Math.max(ordered.length, 1);
  const seats = ordered.map((player, i) => {
    const angle = (Math.PI * (90 + (i * 360) / n)) / 180;
    const sin = Math.sin(angle);
    return {
      player,
      x: 50 + rx * Math.cos(angle),
      y: 50 + ry * sin,
      flip: sin < -0.25,
    };
  });

  const votedCount = state.players.filter((p) => p.voted).length;
  const allVoted = state.players.length > 0 && votedCount === state.players.length;
  const lonely = spectator ? state.players.length === 0 : state.players.length <= 1;
  const joinUrl = `${location.host}/room/${state.roomId}`;

  return (
    <div className="table-zone">
      <div className="table-felt">
        <div className="table-center">
          {state.revealed ? (
            <Results state={state} consensus={consensus} onReset={spectator ? undefined : onReset} />
          ) : lonely ? (
            spectator ? (
              <>
                <div className="center-title">Waitin’ for the posse…</div>
                <div className="center-sub center-sub--url">join at {joinUrl}</div>
              </>
            ) : (
              <>
                <div className="center-title">It’s lonely out here, partner</div>
                <div className="center-sub">Rustle up a posse with the invite link</div>
                <button type="button" className="btn btn--gold" onClick={onInvite}>
                  {copied ? "✓ Copied!" : "🔗 Copy invite link"}
                </button>
              </>
            )
          ) : (
            <>
              <motion.div
                key={votedCount}
                className="center-count"
                initial={{ scale: 1.35 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                {votedCount}
                <span className="center-count__total">/{state.players.length}</span>
              </motion.div>
              <div className="center-title">
                {votedCount === 0 ? "Place your bets!" : allVoted ? "Everyone’s in!" : "Waitin’ on the rest…"}
              </div>
              {!spectator && (
                <button
                  type="button"
                  className={`btn btn--coral btn--big${allVoted ? " btn--party" : ""}`}
                  disabled={votedCount === 0}
                  onClick={onReveal}
                >
                  Reveal
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <AnimatePresence>
        {seats.map((s, i) => (
          <PlayerSeat
            key={s.player.id}
            player={s.player}
            isMe={!spectator && s.player.id === playerId}
            revealed={state.revealed}
            x={s.x}
            y={s.y}
            flip={s.flip}
            flipDelay={i * 0.09}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
