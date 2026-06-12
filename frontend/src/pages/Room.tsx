import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { ConnStatus, Profile, RoomState } from "../types";
import { createConnection } from "../lib/connection";
import type { RoomConnection } from "../lib/connection";
import { getPlayerId, loadProfile, saveProfile, takePendingDeck } from "../lib/session";
import { isConsensus } from "../lib/game";
import { navigate } from "../lib/router";
import { Table } from "../components/Table";
import { CardHand } from "../components/CardHand";
import { DeckModal } from "../components/DeckModal";
import { Confetti } from "../components/Confetti";
import { Logo } from "../components/Logo";
import { ProfileForm } from "../components/ProfileForm";

export function Room({ roomId }: { roomId: string }) {
  const playerId = useMemo(getPlayerId, []);
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [state, setState] = useState<RoomState | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [myVote, setMyVote] = useState<string | null>(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const connRef = useRef<RoomConnection | null>(null);

  useEffect(() => {
    if (!profile) return;
    const conn = createConnection(roomId, playerId, profile, {
      onState: setState,
      onStatus: setStatus,
    });
    connRef.current = conn;
    const pending = takePendingDeck();
    if (pending) conn.send({ type: "deck", cards: pending });
    return () => {
      conn.close();
      connRef.current = null;
    };
  }, [roomId, profile, playerId]);

  // A new round (reset or deck change) clears the local selection.
  const round = state?.round;
  useEffect(() => {
    setMyVote(null);
  }, [round]);

  const consensus = useMemo(() => isConsensus(state), [state]);

  const castVote = (value: string) => {
    if (!state || state.revealed) return;
    const next = myVote === value ? null : value;
    setMyVote(next);
    connRef.current?.send({ type: "vote", value: next });
  };

  const openTv = () => {
    const url = `${location.origin}/room/${roomId}/tv`;
    if (!window.open(url, "showdown-tv", "popup=yes,width=1280,height=800")) {
      window.open(url, "_blank");
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
    } catch {
      /* clipboard unavailable — the room code in the URL still works */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (!profile) {
    return (
      <div className="gate">
        <Logo />
        <ProfileForm
          title="Take a seat"
          cta="Join the game →"
          onSubmit={(p) => {
            saveProfile(p);
            setProfile(p);
          }}
        />
      </div>
    );
  }

  return (
    <div className="room">
      <header className="topbar">
        <a
          className="topbar__logo"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          <span className="topbar__star">★</span>
          <span className="topbar__word">SHOWDOWN</span>
        </a>
        <button type="button" className={`room-pill${copied ? " room-pill--copied" : ""}`} onClick={copyInvite}>
          {copied ? "✓ Link copied!" : `🔗 ${roomId}`}
        </button>
        <div className="topbar__right">
          {status === "demo" && <span className="demo-chip">demo</span>}
          <span className={`status-dot status-dot--${status}`} title={status} />
          <button type="button" className="btn btn--ghost btn--small" onClick={openTv} title="Open the TV display">
            📺<span className="btn-label"> TV</span>
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setDeckOpen(true)} title="Change the deck">
            🃏<span className="btn-label"> Deck</span>
          </button>
        </div>
      </header>

      {status === "offline" && <div className="toast">Lost connection — wranglin’ it back…</div>}

      {state ? (
        <>
          <Table
            state={state}
            playerId={playerId}
            consensus={consensus}
            copied={copied}
            onReveal={() => connRef.current?.send({ type: "reveal" })}
            onReset={() => connRef.current?.send({ type: "reset" })}
            onInvite={copyInvite}
          />
          <CardHand deck={state.deck} myVote={myVote} locked={state.revealed} onPick={castVote} />
        </>
      ) : (
        <div className="loading">Shufflin’ the deck…</div>
      )}

      <AnimatePresence>
        {deckOpen && state && (
          <DeckModal
            current={state.deck}
            onClose={() => setDeckOpen(false)}
            onSave={(cards) => {
              connRef.current?.send({ type: "deck", cards });
              setDeckOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {consensus && state && <Confetti key={state.round} />}
    </div>
  );
}
