import { describe, expect, it } from "vitest";

import { qrSvg } from "./qr";

describe("qrSvg", () => {
  it("renders an svg matrix for a pairing url", () => {
    const svg = qrSvg("http://localhost:3050/i/wa/demo-token");
    expect(svg).toContain("<svg");
    expect(svg).toContain("currentColor");
  });
});
