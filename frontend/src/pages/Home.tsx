import { useState } from "react";
import { motion } from "motion/react";
import type { Profile } from "../types";
import { DECK_PRESETS, DEFAULT_DECK, parseCustomDeck } from "../lib/decks";
import { generateRoomId, loadProfile, saveProfile, stashPendingDeck } from "../lib/session";
import { navigate } from "../lib/router";
import { Logo } from "../components/Logo";
import { ProfileForm } from "../components/ProfileForm";
import { CardBack, CardFace } from "../components/Cards";

export function Home() {
  const [deckId, setDeckId] = useState(DECK_PRESETS[0].id);
  const [customRaw, setCustomRaw] = useState("1, 2, 3, 5, 8");

  const chosenDeck =
    deckId === "custom"
      ? parseCustomDeck(customRaw)
      : (DECK_PRESETS.find((d) => d.id === deckId)?.cards ?? DEFAULT_DECK);

  const create = (profile: Profile) => {
    saveProfile(profile);
    stashPendingDeck(chosenDeck ?? DEFAULT_DECK);
    navigate(`/room/${generateRoomId()}`);
  };

  return (
    <div className="home">
      <header className="hero">
        <HeroCards />
        <Logo />
        <motion.p
          className="tagline"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          Saddle up. Point stories. Settle the score.
        </motion.p>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, type: "spring", stiffness: 220, damping: 22 }}
      >
        <ProfileForm title="Join the posse" cta="Deal me in →" initial={loadProfile()} onSubmit={create}>
          <div className="field">
            <span className="field__label">Deck</span>
            <div className="deck-pills">
              {DECK_PRESETS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`pill${deckId === d.id ? " pill--on" : ""}`}
                  onClick={() => setDeckId(d.id)}
                >
                  {d.label}
                </button>
              ))}
              <button
                type="button"
                className={`pill${deckId === "custom" ? " pill--on" : ""}`}
                onClick={() => setDeckId("custom")}
              >
                Custom
              </button>
            </div>
            {deckId === "custom" && (
              <input
                className="input"
                value={customRaw}
                onChange={(e) => setCustomRaw(e.target.value)}
                placeholder="1, 2, 3, 5, 8"
              />
            )}
            <div className="deck-preview">
              {(chosenDeck ?? []).map((v) => (
                <CardFace key={v} value={v} size="xs" />
              ))}
            </div>
          </div>
        </ProfileForm>
      </motion.div>

      <p className="footnote">
        No sign-up. No database. Rooms vanish like tumbleweed when everyone leaves.
      </p>
    </div>
  );
}

function HeroCards() {
  return (
    <div className="hero-cards" aria-hidden>
      <motion.div
        className="hero-card hero-card--l"
        initial={{ y: 120, opacity: 0, rotate: -40 }}
        animate={{ y: 0, opacity: 1, rotate: -16 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 220, damping: 18 }}
      >
        <CardFace value="13" size="lg" />
      </motion.div>
      <motion.div
        className="hero-card hero-card--r"
        initial={{ y: 120, opacity: 0, rotate: 40 }}
        animate={{ y: 0, opacity: 1, rotate: 14 }}
        transition={{ delay: 0.62, type: "spring", stiffness: 220, damping: 18 }}
      >
        <CardBack size="lg" />
      </motion.div>
    </div>
  );
}
