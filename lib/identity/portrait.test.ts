import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { portraitFromEmail } from "@/lib/identity/portrait";

describe("portraitFromEmail", () => {
  it("hashes a trimmed lowercase address for Gravatar", () => {
    const hash = createHash("sha256").update("ada@example.com").digest("hex");
    expect(portraitFromEmail("  Ada@Example.com ")).toBe(
      `https://www.gravatar.com/avatar/${hash}?s=128&d=404`,
    );
  });

  it("returns nothing when there is no address", () => {
    expect(portraitFromEmail(null)).toBeNull();
    expect(portraitFromEmail("not-an-email")).toBeNull();
  });
});
