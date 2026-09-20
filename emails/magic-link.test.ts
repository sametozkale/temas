import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { MagicLinkEmail } from "./magic-link";

const gotrue = readFileSync(
  join(process.cwd(), "supabase/templates/magic_link.html"),
  "utf8",
);

describe("magic-link email", () => {
  it("shares design-system chrome with the GoTrue template", async () => {
    const html = await render(
      MagicLinkEmail({
        signInUrl: "https://example.com/sign-in",
        email: "you@agency.com",
      }),
    );

    for (const token of [
      "#fafaf7",
      "#22211e",
      "#e9e6e0",
      "#6e6c66",
      "Newsreader",
      "Sign in to Temas",
    ]) {
      expect(html.toLowerCase()).toContain(token.toLowerCase());
      expect(gotrue.toLowerCase()).toContain(token.toLowerCase());
    }

    expect(html).toContain("Sign in");
    expect(gotrue).toContain("token_hash={{ .TokenHash }}");
    expect(gotrue).not.toContain("{{ .ConfirmationURL }}");
  });
});
