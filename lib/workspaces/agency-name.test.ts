import { describe, expect, it } from "vitest";

import { workspaceAgencyName } from "./agency-name";

describe("workspaceAgencyName", () => {
  it("prefers the official company name", () => {
    expect(
      workspaceAgencyName({
        name: "Temas Demo",
        legalName: "Temas Demo Gayrimenkul Ltd.",
      }),
    ).toBe("Temas Demo Gayrimenkul Ltd.");
  });

  it("falls back to the team-facing workspace name", () => {
    expect(workspaceAgencyName({ name: "Temas Demo", legalName: "  " })).toBe(
      "Temas Demo",
    );
    expect(workspaceAgencyName({ name: "Temas Demo", legalName: null })).toBe(
      "Temas Demo",
    );
  });
});
