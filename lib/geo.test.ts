import { describe, expect, it } from "vitest";

import { normalizeCountry, parseCities, parseCountries } from "@/lib/geo";

describe("geo", () => {
  it("maps Türkiye to the CountriesNow name", () => {
    expect(normalizeCountry("Türkiye")).toBe("Turkey");
    expect(normalizeCountry("turkiye")).toBe("Turkey");
  });

  it("pins Turkey and sorts the rest", () => {
    const countries = parseCountries({
      error: false,
      data: [
        { name: "Germany", iso2: "DE" },
        { name: "Turkey", iso2: "TR" },
        { name: "Albania", iso2: "AL" },
      ],
    });
    expect(countries.map((c) => c.iso2)).toEqual(["TR", "AL", "DE"]);
  });

  it("dedupes city names", () => {
    expect(
      parseCities({ error: false, data: ["İzmir", "Ankara", "İzmir"] }),
    ).toEqual(["Ankara", "İzmir"]);
  });
});
