import { motion } from "motion/react";

const LETTERS = [..."SHOWDOWN"];
const TILTS = [-5, 3, -2, 4, -3, 2, -4, 5];

export function Logo() {
  return (
    <div className="logo-big" role="heading" aria-level={1} aria-label="Showdown">
      <span className="logo-big__star" aria-hidden>
        ★
      </span>
      {LETTERS.map((ch, i) => (
        <motion.span
          key={i}
          className="logo-big__letter"
          aria-hidden
          initial={{ y: -90, opacity: 0, rotate: -12 }}
          animate={{ y: 0, opacity: 1, rotate: TILTS[i] }}
          transition={{ delay: 0.06 * i, type: "spring", stiffness: 380, damping: 16 }}
        >
          {ch}
        </motion.span>
      ))}
    </div>
  );
}
