import { describe, expect, it } from "vitest";

import { applyVariables, extractVariables, mergeValues } from "./variables";

describe("contract variables", () => {
  it("extracts unique {{variable}} keys", () => {
    expect(
      extractVariables("Rent {{rent}} for {{tenant_name}} at {{rent}}."),
    ).toEqual(["rent", "tenant_name"]);
  });

  it("reports missing fields instead of guessing", () => {
    const result = applyVariables(
      "Landlord {{landlord_name}}, rent {{rent}} {{currency}}.",
      { landlord_name: "Samet", rent: "  " },
    );
    expect(result.missing).toEqual(["rent", "currency"]);
    expect(result.body).toContain("{{rent}}");
    expect(result.body).toContain("Samet");
  });

  it("fills known values", () => {
    const result = applyVariables("{{tenant_name}} rents {{property_title}}.", {
      tenant_name: "Elif Kaya",
      property_title: "Kadıköy bright 2+1",
    });
    expect(result.missing).toEqual([]);
    expect(result.body).toBe("Elif Kaya rents Kadıköy bright 2+1.");
  });

  it("merges overrides over defaults", () => {
    expect(
      mergeValues({ rent: "10000", deposit: "20000" }, { rent: "12000" }),
    ).toEqual({ rent: "12000", deposit: "20000" });
  });
});
