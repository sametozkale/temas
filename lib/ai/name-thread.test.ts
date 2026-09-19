import { describe, expect, it } from "vitest";

import { mockThreadTitle } from "@/lib/ai/name-thread";

describe("mockThreadTitle", () => {
  it("shortens a question into a title", () => {
    expect(mockThreadTitle("How many viewings this month?")).toBe(
      "Viewings this month",
    );
  });

  it("returns a fallback for empty input", () => {
    expect(mockThreadTitle("   ")).toBe("New chat");
  });
});
