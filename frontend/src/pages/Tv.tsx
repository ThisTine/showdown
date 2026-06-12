import { useEffect, useMemo, useState } from "react";
import type { ConnStatus, RoomState } from "../types";
import { createConnection } from "../lib/connection";
import { isConsensus } from "../lib/game";
import { Table } from "../components/Table";
import { Confetti } from "../components/Confetti";

/** Big-screen spectator view: no seat, no controls, just the showdown. */
export function TvRoom({ roomId }: { roomId: string }) {
  const [state, setState] = useState<RoomState | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const conn = createConnection(
      roomId,
      "tv",
      { name: "TV", emoji: "📺" },
      { onState: setState, onStatus: setStatus },
      { spectator: true },
    );
    return () => conn.close();
  }, [roomId]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const consensus = useMemo(() => isConsensus(state), [state]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div className="tv">
      <header className="tvbar">
        <div className="tvbar__logo">
          <span className="topbar__star">★</span>
          <span>SHOWDOWN</span>
        </div>
        <div className="tvbar__room">
          <div className="tvbar__code">{roomId}</div>
          <div className="tvbar__url">join at {location.host}/room/{roomId}</div>
        </div>
        <div className="tvbar__right">
          {status === "demo" && <span className="demo-chip">demo</span>}
          <span className={`status-dot status-dot--${status}`} title={status} />
          <button type="button" className="btn btn--ghost btn--small" onClick={toggleFullscreen}>
            {fullscreen ? "✕ Exit" : "⛶ Fullscreen"}
          </button>
        </div>
      </header>

      {state ? (
        <Table state={state} playerId="" consensus={consensus} spectator />
      ) : (
        <div className="loading">Tunin’ in…</div>
      )}

      {consensus && state && <Confetti key={state.round} count={140} />}
    </div>
  );
}
