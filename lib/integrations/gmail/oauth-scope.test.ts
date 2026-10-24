import { describe, expect, it } from "vitest";

import {
  GOOGLE_OAUTH_SCOPES,
  googleGrantedScope,
} from "@/lib/integrations/gmail/oauth";

describe("googleGrantedScope", () => {
  it("keeps a partial grant and fills a missing scope with the request", () => {
    expect(googleGrantedScope(undefined)).toBe(GOOGLE_OAUTH_SCOPES);
    expect(googleGrantedScope("  ")).toBe(GOOGLE_OAUTH_SCOPES);
    expect(
      googleGrantedScope("https://www.googleapis.com/auth/gmail.readonly"),
    ).toBe("https://www.googleapis.com/auth/gmail.readonly");
    expect(GOOGLE_OAUTH_SCOPES).toContain(
      "https://www.googleapis.com/auth/calendar.readonly",
    );
  });
});
