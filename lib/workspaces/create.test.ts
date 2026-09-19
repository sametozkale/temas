import { describe, expect, it } from "vitest";

import { isMembershipWorkspace } from "./create";

describe("isMembershipWorkspace", () => {
  it("allows a workspace the user belongs to", () => {
    expect(
      isMembershipWorkspace(
        [{ workspaceId: "a" }, { workspaceId: "b" }],
        "b",
      ),
    ).toBe(true);
  });

  it("rejects a workspace with no membership", () => {
    expect(isMembershipWorkspace([{ workspaceId: "a" }], "z")).toBe(false);
  });
});
