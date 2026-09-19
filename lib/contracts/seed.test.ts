import { describe, expect, it } from "vitest";

import { extractVariables } from "./variables";
import { variablesFromBody } from "./placeholders";
import {
  NEW_TEMPLATE_BODY,
  SEED_CONTRACT_TEMPLATES,
  seedTemplatesMissing,
  shouldReplaceStarterBody,
  starterTemplateByName,
  templateKindForName,
} from "./seed";

describe("contract starter pack", () => {
  it("covers each letting-file kind once", () => {
    const names = SEED_CONTRACT_TEMPLATES.map((row) => row.name);
    expect(new Set(names).size).toBe(names.length);
    expect(SEED_CONTRACT_TEMPLATES.map((row) => row.kind).sort()).toEqual(
      ["deposit", "handover", "lease", "mandate", "offer", "vacate"].sort(),
    );
  });

  it("keeps a jurisdiction placeholder in every starter and the blank template", () => {
    for (const row of SEED_CONTRACT_TEMPLATES) {
      expect(row.bodyMd).toContain("{{jurisdiction}}");
      expect(row.bodyMd).toContain("This is not legal advice");
    }
    expect(NEW_TEMPLATE_BODY).toContain("{{jurisdiction}}");
  });

  it("declares the same variables the markdown uses", () => {
    for (const row of SEED_CONTRACT_TEMPLATES) {
      expect(row.variables.map((item) => item.key).sort()).toEqual(
        extractVariables(row.bodyMd).sort(),
      );
    }
  });

  it("inserts only missing starter names", () => {
    const missing = seedTemplatesMissing(["Deposit receipt"]);
    expect(missing.map((row) => row.name)).toEqual([
      "Listing mandate",
      "Residential rental agreement",
      "Reservation offer",
      "Handover protocol",
      "Eviction undertaking",
    ]);
  });

  it("upgrades old stubs without jurisdiction, not lawyer-edited copy", () => {
    expect(shouldReplaceStarterBody("# Deposit receipt\n\nReceived.")).toBe(
      true,
    );
    expect(
      shouldReplaceStarterBody("Local law in {{jurisdiction}} prevails."),
    ).toBe(false);
  });

  it("matches starters by name", () => {
    expect(starterTemplateByName("Listing mandate")?.kind).toBe("mandate");
    expect(templateKindForName("Listing mandate")).toBe("mandate");
    expect(templateKindForName("Office side letter")).toBe("custom");
  });
});

describe("contract placeholders", () => {
  it("labels known keys from the body", () => {
    expect(variablesFromBody("{{landlord_name}} / {{mystery}}")).toEqual([
      { key: "landlord_name", label: "Landlord" },
      { key: "mystery", label: "mystery" },
    ]);
  });
});
