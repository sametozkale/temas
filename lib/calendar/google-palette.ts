/**
 * Google Calendar's event-colour picker: English names and the 6-column grid
 * (similar hues stacked, left to right). A custom label name from the API wins.
 */
const GOOGLE_PALETTE: { color: string; name: string }[] = [
  { color: "#ad1457", name: "Radicchio" },
  { color: "#f4511e", name: "Tangerine" },
  { color: "#e4c441", name: "Citron" },
  { color: "#0b8043", name: "Basil" },
  { color: "#3f51b5", name: "Blueberry" },
  { color: "#8e24aa", name: "Grape" },
  { color: "#d81b60", name: "Cherry Blossom" },
  { color: "#ef6c00", name: "Pumpkin" },
  { color: "#c0ca33", name: "Avocado" },
  { color: "#009688", name: "Eucalyptus" },
  { color: "#7986cb", name: "Lavender" },
  { color: "#795548", name: "Cocoa" },
  { color: "#d50000", name: "Tomato" },
  { color: "#f09300", name: "Mango" },
  { color: "#7cb342", name: "Pistachio" },
  { color: "#039be5", name: "Peacock" },
  { color: "#b39ddb", name: "Wisteria" },
  { color: "#616161", name: "Graphite" },
  { color: "#e67c73", name: "Flamingo" },
  { color: "#f6bf26", name: "Banana" },
  { color: "#33b679", name: "Sage" },
  { color: "#4285f4", name: "Cobalt" },
  { color: "#9e69af", name: "Amethyst" },
  { color: "#a79b8e", name: "Birch" },
];

const BY_COLOR = new Map(
  GOOGLE_PALETTE.map((entry, index) => [entry.color, { ...entry, index }]),
);

/** Classic event colour ids, in Google's single-row picker order. */
const LEGACY_ORDER = ["11", "4", "6", "5", "2", "10", "7", "9", "1", "3", "8"];
const LEGACY_NAMES: Record<string, string> = {
  "1": "Lavender",
  "2": "Sage",
  "3": "Grape",
  "4": "Flamingo",
  "5": "Banana",
  "6": "Tangerine",
  "7": "Peacock",
  "8": "Graphite",
  "9": "Blueberry",
  "10": "Basil",
  "11": "Tomato",
};

export type NamedSwatch = { id: string; color: string; name: string };

export function presentGoogleSwatches(
  swatches: { id: string; color: string; name?: string }[],
): NamedSwatch[] {
  const ranked = swatches.map((swatch, index) => {
    const known = BY_COLOR.get(swatch.color.toLowerCase());
    const legacyIndex = LEGACY_ORDER.indexOf(swatch.id);
    return {
      id: swatch.id,
      color: swatch.color,
      name: swatch.name?.trim() || known?.name || LEGACY_NAMES[swatch.id] || "",
      rank: known?.index ?? (legacyIndex >= 0 ? 100 + legacyIndex : 1000 + index),
      index,
    };
  });
  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return ranked.map(({ id, color, name }) => ({ id, color, name }));
}
