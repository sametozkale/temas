import { describe, expect, it } from "vitest";

import { acceptancePct } from "./acceptance";

describe("acceptancePct", () => {
  it("is 100 when the sent body matches the draft", () => {
    expect(
      acceptancePct("Hello Elif, see you soon.", "Hello Elif, see you soon."),
    ).toBe(100);
  });

  it("uses dice coefficient on word sets", () => {
    expect(acceptancePct("a b c", "a b d")).toBe(67);
  });

  it("ignores urls and punctuation", () => {
    expect(
      acceptancePct("Pick a time http://x.test/b/abc", "Pick a time"),
    ).toBe(100);
  });
});
