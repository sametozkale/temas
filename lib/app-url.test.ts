import { afterEach, describe, expect, it } from "vitest";

import { isLoopbackHost, publicOriginFromRedirect } from "./app-url";

describe("publicOriginFromRedirect", () => {
  const prev = process.env.APP_URL;

  afterEach(() => {
    process.env.APP_URL = prev;
  });

  it("replaces localhost redirects with APP_URL", () => {
    process.env.APP_URL = "https://temas-oberyon.vercel.app";
    expect(
      publicOriginFromRedirect(
        "http://localhost:3050/auth/callback?next=/home",
      ),
    ).toBe("https://temas-oberyon.vercel.app");
  });

  it("keeps a public redirect origin", () => {
    process.env.APP_URL = "https://temas-oberyon.vercel.app";
    expect(
      publicOriginFromRedirect(
        "https://temas-oberyon.vercel.app/auth/callback?next=/home",
      ),
    ).toBe("https://temas-oberyon.vercel.app");
  });

  it("detects loopback hosts", () => {
    expect(isLoopbackHost("localhost:3050")).toBe(true);
    expect(isLoopbackHost("http://127.0.0.1:3000/x")).toBe(true);
    expect(isLoopbackHost("temas-oberyon.vercel.app")).toBe(false);
  });
});
