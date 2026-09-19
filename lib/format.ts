/** Display formatting helpers (locale fixed to en for v1, docs/02 §6). */

const LOCALE = "en-GB";

export function formatMoney(
  amount: string | number | null | undefined,
  currency = "TRY",
) {
  if (amount === null || amount === undefined || amount === "") return null;
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

export function formatNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(n);
}

/** Floor in the building, e.g. "5 / 6". */
export function formatFloor(
  floor: number | null | undefined,
  totalFloors?: number | null,
) {
  if (floor == null && totalFloors == null) return null;
  if (floor != null && totalFloors != null) return `${floor} / ${totalFloors}`;
  if (floor != null) return String(floor);
  return String(totalFloors);
}

export function formatPricePerM2(
  rent: string | number | null | undefined,
  areaM2: string | number | null | undefined,
  currency = "TRY",
) {
  const r = typeof rent === "string" ? Number(rent) : rent;
  const a = typeof areaM2 === "string" ? Number(areaM2) : areaM2;
  if (
    r == null ||
    a == null ||
    !Number.isFinite(r) ||
    !Number.isFinite(a) ||
    a <= 0
  ) {
    return null;
  }
  return formatMoney(r / a, currency);
}

export function formatDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  timeZone?: string,
) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone }).format(d);
}

export function formatDateTime(value: Date | string, timeZone?: string) {
  return formatDate(
    value,
    { dateStyle: "medium", timeStyle: "short" },
    timeZone,
  );
}

export function formatRelative(value: Date | string, now = new Date()) {
  const d = typeof value === "string" ? new Date(value) : value;
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return formatDate(d);
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatAddress(
  address:
    | { line?: string; district?: string; city?: string; country?: string }
    | null
    | undefined,
  options: { short?: boolean } = {},
) {
  if (!address) return null;
  const parts = options.short
    ? [address.district, address.city]
    : [address.line, address.district, address.city, address.country];
  const text = parts.filter(Boolean).join(", ");
  return text || null;
}
