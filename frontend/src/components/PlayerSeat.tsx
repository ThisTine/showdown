import { motion } from "motion/react";
import type { Player } from "../types";
import { FlipCard } from "./Cards";

interface SeatProps {
  player: Player;
  isMe: boolean;
  revealed: boolean;
  /** Seat position, in percent of the table zone. */
  x: number;
  y: number;
  /** Top-half seats render their card below the avatar, toward the felt. */
  flip: boolean;
  flipDelay: number;
}

export function PlayerSeat({ player, isMe, revealed, x, y, flip, flipDelay }: SeatProps) {
  const left = `${x}%`;
  const top = `${y}%`;
  return (
    <motion.div
      className={`seat${flip ? " seat--flip" : ""}${isMe ? " seat--me" : ""}`}
      style={{ left, top }}
      initial={{ opacity: 0, scale: 0, x: "-50%", y: "-50%" }}
      animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%", left, top }}
      exit={{ opacity: 0, scale: 0, x: "-50%", y: "-50%", transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 320, damping: 25 }}
    >
      <div className="seat__cardspot">
        {player.voted ? (
          <div className={revealed ? undefined : "wobble"}>
            <FlipCard revealed={revealed && player.vote !== null} value={player.vote ?? ""} delay={flipDelay} />
          </div>
        ) : (
          <div className="seat__waiting">
            {revealed ? (
              <span className="seat__novote">—</span>
            ) : (
              <span className="dots">
                <span />
                <span />
                <span />
              </span>
            )}
          </div>
        )}
      </div>
      <div className="seat__avatar">{player.emoji}</div>
      <div className="seat__name">{isMe ? "you" : player.name}</div>
    </motion.div>
  );
}
