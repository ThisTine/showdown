import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { DECK_PRESETS, parseCustomDeck } from "../lib/decks";
import { CardFace } from "./Cards";

interface DeckModalProps {
  current: string[];
  onSave(cards: string[]): void;
  onClose(): void;
}

export function DeckModal({ current, onSave, onClose }: DeckModalProps) {
  const [raw, setRaw] = useState(current.join(", "));
  const parsed = useMemo(() => parseCustomDeck(raw), [raw]);

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal"
        initial={{ scale: 0.8, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title">🃏 Pick your deck</h2>
        <div className="deck-pills">
          {DECK_PRESETS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`pill${sameDeck(d.cards, parsed) ? " pill--on" : ""}`}
              onClick={() => setRaw(d.cards.join(", "))}
            >
              {d.label}
            </button>
          ))}
        </div>
        <label className="field">
          <span className="field__label">Cards (comma separated)</span>
          <input className="input" value={raw} onChange={(e) => setRaw(e.target.value)} />
        </label>
        <div className="deck-preview">
          {(parsed ?? []).map((v) => (
            <CardFace key={v} value={v} size="xs" />
          ))}
        </div>
        <p className="modal__hint">Changing the deck starts a fresh round for everyone.</p>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--gold"
            disabled={!parsed}
            onClick={() => parsed && onSave(parsed)}
          >
            Save &amp; re-deal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function sameDeck(a: string[], b: string[] | null): boolean {
  return b !== null && a.length === b.length && a.every((v, i) => v === b[i]);
}
