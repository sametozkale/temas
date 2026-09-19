/** ISO 4217 codes for rent / deposit / dues. */
const PINNED = ["TRY", "EUR", "USD", "GBP"] as const;

function loadCurrencies(): string[] {
  const codes = Intl.supportedValuesOf("currency").filter((code) =>
    /^[A-Z]{3}$/.test(code),
  );
  const available = new Set(codes);
  const head = PINNED.filter((code) => available.has(code));
  const pinned = new Set<string>(head);
  const rest = codes.filter((code) => !pinned.has(code)).sort();
  return [...head, ...rest];
}

export const CURRENCIES: readonly string[] = loadCurrencies();

const CURRENCY_SET = new Set(CURRENCIES);

export type Currency = string;

export function isValidCurrency(code: string): boolean {
  return CURRENCY_SET.has(code);
}

const names = new Intl.DisplayNames(["en"], { type: "currency" });

export function currencyLabel(code: string): string {
  try {
    const name = names.of(code);
    return name && name !== code ? `${code} · ${name}` : code;
  } catch {
    return code;
  }
}
