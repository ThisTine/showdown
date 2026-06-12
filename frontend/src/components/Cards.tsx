import { motion } from "motion/react";

export type CardSize = "lg" | "sm" | "xs";

export function CardFace({
  value,
  size,
  selected = false,
}: {
  value: string;
  size: CardSize;
  selected?: boolean;
}) {
  const long = [...value].length >= 3;
  return (
    <div className={`cardface cardface--${size}${selected ? " cardface--selected" : ""}`}>
      <span className="cardface__corner cardface__corner--tl">{value}</span>
      <span className="cardface__star" aria-hidden>
        ★
      </span>
      <span className={`cardface__value${long ? " cardface__value--long" : ""}`}>{value}</span>
      <span className="cardface__corner cardface__corner--br">{value}</span>
    </div>
  );
}

export function CardBack({ size }: { size: CardSize }) {
  return (
    <div className={`cardback cardback--${size}`}>
      <span className="cardback__star" aria-hidden>
        ★
      </span>
    </div>
  );
}

/** A seat-sized card that flips face-up when the round is revealed. */
export function FlipCard({ revealed, value, delay }: { revealed: boolean; value: string; delay: number }) {
  return (
    <div className="flip">
      <motion.div
        className="flip__inner"
        initial={false}
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ delay: revealed ? delay : 0, type: "spring", stiffness: 280, damping: 22 }}
      >
        <div className="flip__face flip__face--back">
          <CardBack size="sm" />
        </div>
        <div className="flip__face flip__face--front">
          <CardFace value={value} size="sm" />
        </div>
      </motion.div>
    </div>
  );
}
