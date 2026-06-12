import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CardFace } from "./Cards";

interface HandProps {
  deck: string[];
  myVote: string | null;
  locked: boolean;
  onPick(value: string): void;
}

function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const onChange = () => setMatch(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return match;
}

export function CardHand({ deck, myVote, locked, onPick }: HandProps) {
  // Desktop gets the overlapping fan; phones get a flat wrapped grid with
  // full-size tap targets (layout switch lives in the matching media query).
  const fan = useMediaQuery("(min-width: 701px)");
  const n = deck.length;
  return (
    <div className={`hand${locked ? " hand--locked" : ""}`}>
      <div className="hand__scroller">
        {deck.map((value, i) => {
          const rot = fan ? (i - (n - 1) / 2) * 3 : 0;
          const selected = value === myVote;
          return (
            <motion.div
              key={value}
              className="hand__slot"
              style={{ zIndex: selected ? 40 : i }}
              initial={{ y: 150, opacity: 0, rotate: fan ? 20 : 0 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.25 + i * 0.045, type: "spring", stiffness: 300, damping: 24 }}
            >
              <motion.button
                type="button"
                className="hand__card"
                animate={{
                  y: selected ? (fan ? -22 : -10) : 0,
                  rotate: selected ? 0 : rot,
                  scale: selected ? 1.08 : 1,
                }}
                whileHover={{ y: fan ? -14 : -6, scale: 1.05 }}
                whileTap={{ scale: 0.94, y: -6 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                onClick={() => onPick(value)}
                aria-pressed={selected}
                aria-label={`Vote ${value}`}
              >
                <CardFace value={value} size="lg" selected={selected} />
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
