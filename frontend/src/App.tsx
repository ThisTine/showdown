import { usePath } from "./lib/router";
import { Home } from "./pages/Home";
import { Room } from "./pages/Room";
import { TvRoom } from "./pages/Tv";

export default function App() {
  const path = usePath();
  const roomMatch = path.match(/^\/room\/([\w-]+?)(\/tv)?\/?$/);
  return (
    <>
      <BgScene />
      {roomMatch ? (
        roomMatch[2] ? (
          <TvRoom key={roomMatch[1]} roomId={roomMatch[1]} />
        ) : (
          <Room key={roomMatch[1]} roomId={roomMatch[1]} />
        )
      ) : (
        <Home />
      )}
    </>
  );
}

const SUITS = [
  { ch: "♠", x: 6, y: 16, s: 90, d: 7, delay: 0 },
  { ch: "♥", x: 86, y: 12, s: 70, d: 9, delay: 1.2 },
  { ch: "♦", x: 12, y: 74, s: 80, d: 8, delay: 0.6 },
  { ch: "♣", x: 88, y: 70, s: 100, d: 10, delay: 2 },
  { ch: "★", x: 48, y: 88, s: 60, d: 6.5, delay: 1.6 },
  { ch: "♠", x: 70, y: 42, s: 50, d: 11, delay: 0.3 },
  { ch: "♥", x: 26, y: 40, s: 45, d: 9.5, delay: 2.4 },
];

function BgScene() {
  return (
    <div className="bg" aria-hidden>
      <div className="bg__spotlight" />
      {SUITS.map((s, i) => (
        <span
          key={i}
          className="bg__suit"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            fontSize: s.s,
            animationDuration: `${s.d}s`,
            animationDelay: `${s.delay}s`,
          }}
        >
          {s.ch}
        </span>
      ))}
      <div className="bg__noise" />
    </div>
  );
}
