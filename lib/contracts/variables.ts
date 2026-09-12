const VARIABLE_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function extractVariables(bodyMd: string): string[] {
  const keys = new Set<string>();
  for (const match of bodyMd.matchAll(VARIABLE_RE)) {
    if (match[1]) keys.add(match[1]);
  }
  return [...keys];
}

export function applyVariables(
  bodyMd: string,
  values: Record<string, string | null | undefined>,
) {
  const missing: string[] = [];
  const body = bodyMd.replace(VARIABLE_RE, (_all, key: string) => {
    const raw = values[key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      missing.push(key);
      return `{{${key}}}`;
    }
    return value;
  });
  return { body, missing: [...new Set(missing)] };
}

export function mergeValues(
  defaults: Record<string, string | null | undefined>,
  overrides: Record<string, string | null | undefined>,
) {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed) out[key] = trimmed;
  }
  return out;
}
