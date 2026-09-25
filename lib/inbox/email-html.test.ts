import { describe, expect, it } from "vitest";

import {
  messageSnippet,
  prepareEmailHtml,
  splitQuotedHtml,
  splitQuotedText,
} from "./email-html";

describe("prepareEmailHtml", () => {
  it("keeps the message markup and drops scripts", () => {
    const html = prepareEmailHtml(
      `<p>Hello</p><script>alert(1)</script><a href="https://example.com" onclick="steal()">Open</a>`,
    );
    expect(html).toContain("<p>Hello</p>");
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
  });

  it("keeps the new writing and separates a quoted reply", () => {
    const html = `<p>Here is the update.</p><div class="gmail_quote">On Tue, Kerli wrote:<blockquote>Earlier</blockquote></div>`;
    const parts = splitQuotedHtml(html);
    expect(parts.fresh).toBe("<p>Here is the update.</p>");
    expect(parts.quoted).toContain("gmail_quote");
    expect(messageSnippet(null, html)).toBe("Here is the update.");
  });

  it("leaves a letter alone when it has no quoted history", () => {
    const html = "<p>The whole letter.</p>";
    expect(splitQuotedHtml(html)).toEqual({ fresh: html, quoted: null });
  });

  it("splits a plain reply at the quoted original", () => {
    const body = "Sending the keys.\n\nOn Mon, Ada wrote:\n> previous";
    expect(splitQuotedText(body).fresh).toBe("Sending the keys.");
    expect(messageSnippet(body, null)).toBe("Sending the keys.");
  });

  it("drops javascript urls", () => {
    const html = prepareEmailHtml(`<a href="javascript:alert(1)">x</a>`);
    expect(html).not.toContain("javascript:");
  });
});
