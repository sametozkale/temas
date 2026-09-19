import { describe, expect, it } from "vitest";

import {
  CURRENCIES,
  currencyLabel,
  isValidCurrency,
} from "@/lib/currencies";

describe("currencies", () => {
  it("pins TRY first and includes major codes", () => {
    expect(CURRENCIES[0]).toBe("TRY");
    expect(isValidCurrency("TRY")).toBe(true);
    expect(isValidCurrency("EUR")).toBe(true);
    expect(isValidCurrency("USD")).toBe(true);
    expect(isValidCurrency("GBP")).toBe(true);
    expect(isValidCurrency("AED")).toBe(true);
    expect(isValidCurrency("xxx")).toBe(false);
    expect(CURRENCIES.length).toBeGreaterThan(50);
  });

  it("labels a code with its English name", () => {
    expect(currencyLabel("TRY")).toMatch(/^TRY · /);
    expect(currencyLabel("EUR")).toContain("Euro");
  });
});
