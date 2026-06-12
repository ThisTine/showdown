export interface DeckPreset {
  id: string;
  label: string;
  cards: string[];
}

export const DECK_PRESETS: DeckPreset[] = [
  {
    id: "fibonacci",
    label: "Fibonacci",
    cards: ["0", "1", "2", "3", "5", "8", "13", "21", "34", "?", "☕"],
  },
  {
    id: "tshirt",
    label: "T-Shirt",
    cards: ["XS", "S", "M", "L", "XL", "XXL", "?", "☕"],
  },
  {
    id: "powers",
    label: "Powers of 2",
    cards: ["1", "2", "4", "8", "16", "32", "64", "?", "☕"],
  },
];

export const DEFAULT_DECK = DECK_PRESETS[0].cards;

const MAX_CARDS = 15;
const MAX_CARD_LEN = 4;

/** Parse a comma/space separated custom deck. Returns null if unusable. */
export function parseCustomDeck(raw: string): string[] | null {
  const seen = new Set<string>();
  const cards: string[] = [];
  for (const piece of raw.split(/[,\s]+/)) {
    const v = piece.trim();
    if (!v || [...v].length > MAX_CARD_LEN || seen.has(v)) continue;
    seen.add(v);
    cards.push(v);
    if (cards.length === MAX_CARDS) break;
  }
  return cards.length >= 2 ? cards : null;
}
