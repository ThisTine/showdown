import { useState } from "react";
import type { ReactNode } from "react";
import type { Profile } from "../types";

const AVATARS = ["🤠", "🐴", "🌵", "🦅", "🐺", "🦊", "🐻", "🐍", "⭐", "🦬"];

interface ProfileFormProps {
  title: string;
  cta: string;
  initial?: Profile | null;
  onSubmit(profile: Profile): void;
  /** Extra fields (e.g. the deck picker on the home page). */
  children?: ReactNode;
}

export function ProfileForm({ title, cta, initial, onSubmit, children }: ProfileFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(
    () => initial?.emoji ?? AVATARS[Math.floor(Math.random() * AVATARS.length)],
  );

  return (
    <form
      className="poster"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim().slice(0, 16);
        if (trimmed) onSubmit({ name: trimmed, emoji });
      }}
    >
      <h2 className="poster__title">{title}</h2>
      <label className="field">
        <span className="field__label">Outlaw name</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Billy the Kid"
          maxLength={16}
          autoFocus
        />
      </label>
      <div className="field">
        <span className="field__label">Pick your face</span>
        <div className="emoji-grid">
          {AVATARS.map((a) => (
            <button
              type="button"
              key={a}
              className={`emoji-opt${a === emoji ? " emoji-opt--on" : ""}`}
              onClick={() => setEmoji(a)}
              aria-pressed={a === emoji}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      {children}
      <button type="submit" className="btn btn--gold btn--big poster__cta" disabled={!name.trim()}>
        {cta}
      </button>
    </form>
  );
}
