const COUNTRIES_URL =
  "https://countriesnow.space/api/v0.1/countries/positions";
const CITIES_URL = "https://countriesnow.space/api/v0.1/countries/cities/q";

const FETCH_INIT: RequestInit & { next: { revalidate: number } } = {
  headers: { Accept: "application/json", "User-Agent": "Temas/1.0" },
  next: { revalidate: 86_400 },
};

export type GeoCountry = { name: string; iso2: string };

const COUNTRY_ALIASES: Record<string, string> = {
  türkiye: "Turkey",
  turkiye: "Turkey",
  turkey: "Turkey",
};

export function normalizeCountry(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return COUNTRY_ALIASES[trimmed.toLocaleLowerCase("tr")] ?? trimmed;
}

function readPayload(json: unknown): unknown[] {
  if (!json || typeof json !== "object") return [];
  const row = json as { error?: boolean; data?: unknown };
  if (row.error || !Array.isArray(row.data)) return [];
  return row.data;
}

export function parseCountries(json: unknown): GeoCountry[] {
  const rows = readPayload(json)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { name?: unknown; iso2?: unknown };
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const iso2 =
        typeof row.iso2 === "string" ? row.iso2.trim().toUpperCase() : "";
      if (!name || !/^[A-Z]{2}$/.test(iso2)) return null;
      return { name, iso2 };
    })
    .filter((row): row is GeoCountry => row !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  const pinned = rows.filter((row) => row.iso2 === "TR");
  const rest = rows.filter((row) => row.iso2 !== "TR");
  return [...pinned, ...rest];
}

export function parseCities(json: unknown): string[] {
  const names = readPayload(json)
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "en"));
}

export async function fetchCountries(): Promise<GeoCountry[]> {
  const res = await fetch(COUNTRIES_URL, FETCH_INIT);
  if (!res.ok) throw new Error("countries_unavailable");
  return parseCountries(await res.json());
}

export async function fetchCities(country: string): Promise<string[]> {
  const name = normalizeCountry(country);
  if (!name) return [];
  const url = `${CITIES_URL}?country=${encodeURIComponent(name)}`;
  const res = await fetch(url, FETCH_INIT);
  if (!res.ok) throw new Error("cities_unavailable");
  return parseCities(await res.json());
}
