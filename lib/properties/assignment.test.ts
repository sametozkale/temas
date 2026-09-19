import { describe, expect, it } from "vitest";

import { isAssignableRole } from "./assignment";

describe("isAssignableRole", () => {
  it("allows owner and agent", () => {
    expect(isAssignableRole("owner")).toBe(true);
    expect(isAssignableRole("agent")).toBe(true);
  });

  it("rejects assistant and empty values", () => {
    expect(isAssignableRole("assistant")).toBe(false);
    expect(isAssignableRole(null)).toBe(false);
    expect(isAssignableRole(undefined)).toBe(false);
    expect(isAssignableRole("")).toBe(false);
  });
});
