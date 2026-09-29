import { describe, expect, it } from "vitest";

import { APPROVAL_ACTIONS, AUTO_ACTIONS, needsApproval } from "./policy";

describe("needsApproval", () => {
  it("runs low-risk actions at once", () => {
    expect(needsApproval("createTask", { title: "Call owner" })).toBe(false);
    expect(needsApproval("updatePropertyFields", {})).toBe(false);
  });

  it("asks before sends, deletes and bookings", () => {
    for (const name of ["sendReply", "deleteProperty", "bookViewing", "createProperty"]) {
      expect(needsApproval(name, {})).toBe(true);
    }
  });

  it("asks only for spam and trash in the mailbox", () => {
    expect(needsApproval("manageMailbox", { action: "archive" })).toBe(false);
    expect(needsApproval("manageMailbox", { action: "trash" })).toBe(true);
    expect(needsApproval("manageMailbox", { action: "spam" })).toBe(true);
  });

  it("never lists a tool in both tiers", () => {
    const auto = new Set<string>(AUTO_ACTIONS);
    expect(APPROVAL_ACTIONS.filter((name) => auto.has(name))).toEqual([]);
  });

  it("leaves read tools alone", () => {
    expect(needsApproval("searchProperties", { query: "x" })).toBe(false);
  });
});
