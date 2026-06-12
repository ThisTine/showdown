import { useMemo } from "react";
import { motion } from "motion/react";

const COLORS = ["#ffc233", "#ff5c4d", "#fff4dc", "#3ddc97", "#58c7f3"];

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotate: number;
  drift: number;
  star: boolean;
}

export function Confetti({ count = 90 }: { count?: number }) {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2.4 + Math.random() * 1.8,
        color: COLORS[i % COLORS.length],
        size: 7 + Math.random() * 8,
        rotate: Math.random() * 720 - 360,
        drift: 20 + Math.random() * 50,
        star: Math.random() < 0.14,
      })),
    [count],
  );

  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="confetti__piece"
          style={{
            left: `${p.left}%`,
            width: p.star ? "auto" : p.size,
            height: p.star ? "auto" : p.size * 0.62,
            background: p.star ? "transparent" : p.color,
            color: p.color,
            fontSize: p.size + 4,
          }}
          initial={{ y: "-8vh", opacity: 1, rotate: 0 }}
          animate={{
            y: "110vh",
            x: [0, p.drift, -p.drift, p.drift / 2],
            rotate: p.rotate,
            opacity: [1, 1, 1, 0.6],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "linear" }}
        >
          {p.star ? "★" : ""}
        </motion.span>
      ))}
    </div>
  );
}
