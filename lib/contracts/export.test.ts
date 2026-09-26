import { describe, expect, it } from "vitest";

import { markdownToBlocks } from "./markdown";
import { exportContractDocuments } from "./export";

describe("contract export", () => {
  it("splits markdown into headings and paragraphs", () => {
    expect(
      markdownToBlocks("# Title\n\nHello world.\n\n## Clause\nRent is due."),
    ).toEqual([
      { kind: "h1", text: "Title" },
      { kind: "p", text: "Hello world." },
      { kind: "h2", text: "Clause" },
      { kind: "p", text: "Rent is due." },
    ]);
  });

  it("keeps bullet lines as a list", () => {
    expect(markdownToBlocks("# Title\n\n- Owner\n- Agency\n\nDone.")).toEqual([
      { kind: "h1", text: "Title" },
      { kind: "ul", items: ["Owner", "Agency"] },
      { kind: "p", text: "Done." },
    ]);
  });

  it("builds DOCX and PDF buffers", async () => {
    const files = await exportContractDocuments(
      "Rental agreement",
      "# Rental agreement\n\nTenant Elif rents the flat.",
    );
    expect(files.docx.byteLength).toBeGreaterThan(100);
    expect(files.pdf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
