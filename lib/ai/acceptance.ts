export function acceptancePct(draft: string, sent: string) {
  const a = normalize(draft);
  const b = normalize(sent);
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const wordsA = new Set(a.split(" "));
  const wordsB = new Set(b.split(" "));
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap += 1;
  const dice = (2 * overlap) / (wordsA.size + wordsB.size);
  return Math.round(dice * 100);
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9ğüşöçıİ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
