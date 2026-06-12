import { motion } from "motion/react";
import type { Variants } from "motion/react";
import type { RoomState } from "../types";
import { CardFace } from "./Cards";

interface ResultsProps {
  state: RoomState;
  consensus: boolean;
  /** Omitted in spectator (TV) mode — the button is hidden. */
  onReset?(): void;
}

const pop: Variants = {
  hidden: { opacity: 0, scale: 0.5, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 20 } },
};

export function Results({ state, consensus, onReset }: ResultsProps) {
  const votes = state.players.map((p) => p.vote).filter((v): v is string => v !== null);
  const numeric = votes.map(Number).filter((x) => Number.isFinite(x));
  const avg = numeric.length > 0 ? Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 10) / 10 : null;

  const dist = (() => {
    const counts = new Map<string, number>();
    for (const v of votes) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || state.deck.indexOf(a[0]) - state.deck.indexOf(b[0]),
    );
  })();

  return (
    <motion.div
      className="results"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.45 } } }}
    >
      {consensus && (
        <motion.div className="consensus-banner" variants={pop}>
          🤝 Consensus!
        </motion.div>
      )}
      {avg !== null ? (
        <motion.div className="results__avg-wrap" variants={pop}>
          <span className="results__avg-label">average</span>
          <span className="results__avg">{avg}</span>
        </motion.div>
      ) : (
        dist.length > 0 && (
          <motion.div className="results__avg-wrap" variants={pop}>
            <span className="results__avg-label">the call</span>
            <span className="results__avg">{dist[0][0]}</span>
          </motion.div>
        )
      )}
      <motion.div className="dist" variants={pop}>
        {dist.map(([value, count]) => (
          <span key={value} className="dist__chip">
            <CardFace value={value} size="xs" /> ×{count}
          </span>
        ))}
      </motion.div>
      {onReset && (
        <motion.button type="button" className="btn btn--gold" variants={pop} onClick={onReset}>
          🔄 New round
        </motion.button>
      )}
    </motion.div>
  );
}
