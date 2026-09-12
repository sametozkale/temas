import { describe, expect, it } from "vitest";

import { PROPERTY_STATUSES } from "@/lib/db/schema/properties";

import { canTransition, isPropertyStatus, nextStatuses } from "./status";

describe("property status machine (docs/00 §8)", () => {
  it("walks the happy path forward", () => {
    const path = [...PROPERTY_STATUSES];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it("never allows a self transition", () => {
    for (const s of PROPERTY_STATUSES) expect(canTransition(s, s)).toBe(false);
  });

  it("does not allow skipping stages forward", () => {
    expect(canTransition("draft", "rented")).toBe(false);
    expect(canTransition("active", "contract_pending")).toBe(false);
  });

  it("allows stepping back one stage and archiving from anywhere", () => {
    expect(canTransition("application_review", "viewing_in_progress")).toBe(
      true,
    );
    expect(canTransition("contract_pending", "application_review")).toBe(true);
    for (const s of PROPERTY_STATUSES) {
      if (s === "archived") continue;
      expect(canTransition(s, "archived")).toBe(true);
    }
  });

  it("re-lists rented and archived properties", () => {
    expect(canTransition("rented", "active")).toBe(true);
    expect(canTransition("archived", "draft")).toBe(true);
    expect(canTransition("archived", "rented")).toBe(false);
  });

  it("exposes only valid targets via nextStatuses", () => {
    for (const from of PROPERTY_STATUSES) {
      for (const to of nextStatuses(from)) {
        expect(canTransition(from, to)).toBe(true);
      }
    }
  });

  it("validates unknown strings", () => {
    expect(isPropertyStatus("active")).toBe(true);
    expect(isPropertyStatus("sold")).toBe(false);
    expect(isPropertyStatus(42)).toBe(false);
  });
});
