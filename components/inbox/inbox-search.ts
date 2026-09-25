const KEY = "temas-inbox-search";
const MAX = 120;

let query = "";
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function readInboxSearch() {
  return query;
}

/** Restores the last query before paint. Safe to call more than once. */
export function hydrateInboxSearch() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const stored = sessionStorage.getItem(KEY) ?? "";
  if (stored === query) return;
  query = stored.slice(0, MAX);
  emit();
}

export function setInboxSearch(next: string) {
  const value = next.slice(0, MAX);
  if (value === query) return;
  query = value;
  sessionStorage.setItem(KEY, value);
  emit();
}

export function subscribeInboxSearch(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
