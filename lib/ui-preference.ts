/** Client-only keys. New writes use `temas:`; reads also accept legacy `havn:`. */

function migrate(key: string): string | null {
  const current = window.localStorage.getItem(`temas:${key}`);
  if (current !== null) return current;
  const legacy = window.localStorage.getItem(`havn:${key}`);
  if (legacy === null) return null;
  window.localStorage.setItem(`temas:${key}`, legacy);
  window.localStorage.removeItem(`havn:${key}`);
  return legacy;
}

export function readLocalPreference(key: string): string | null {
  try {
    return migrate(key);
  } catch {
    return null;
  }
}

export function writeLocalPreference(key: string, value: string) {
  try {
    window.localStorage.setItem(`temas:${key}`, value);
    window.localStorage.removeItem(`havn:${key}`);
  } catch {
    // ignore storage errors (private mode etc.)
  }
}
