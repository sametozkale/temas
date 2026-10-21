import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  SUPABASE_SESSION_COOKIE,
  hasSupabaseSessionCookie,
} from "./session-cookie";

describe("hasSupabaseSessionCookie", () => {
  it("matches the Supabase client storage key", () => {
    const constants = readFileSync(
      "node_modules/@supabase/auth-js/dist/module/lib/constants.js",
      "utf8",
    );
    expect(constants).toContain(`STORAGE_KEY = '${SUPABASE_SESSION_COOKIE}'`);
  });

  it("detects a session cookie and its chunks", () => {
    expect(hasSupabaseSessionCookie([])).toBe(false);
    expect(hasSupabaseSessionCookie(["sb-other"])).toBe(false);
    expect(hasSupabaseSessionCookie(["supabase.auth.token"])).toBe(true);
    expect(hasSupabaseSessionCookie(["supabase.auth.token.0"])).toBe(true);
    expect(hasSupabaseSessionCookie(["supabase.auth.token.12"])).toBe(true);
  });

  it("ignores PKCE verifier cookies", () => {
    expect(
      hasSupabaseSessionCookie(["supabase.auth.token-code-verifier"]),
    ).toBe(false);
    expect(
      hasSupabaseSessionCookie(["supabase.auth.token-flow-abc-code-verifier"]),
    ).toBe(false);
  });
});
