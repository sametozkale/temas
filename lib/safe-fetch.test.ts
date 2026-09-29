import { describe, expect, it } from "vitest";

import { isPrivateAddress, parsePublicUrl, SafeFetchError } from "./safe-fetch";

describe("safe fetch guards", () => {
  it("refuses private, loopback and link-local addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.20.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
    ]) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
  });

  it("allows public addresses", () => {
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
    expect(isPrivateAddress("2606:2800:220:1:248:1893:25c8:1946")).toBe(false);
  });

  it("accepts https only, without credentials or odd ports", () => {
    expect(parsePublicUrl("https://example.com/listing/1").hostname).toBe(
      "example.com",
    );
    for (const raw of [
      "http://example.com",
      "file:///etc/passwd",
      "https://user:pw@example.com",
      "https://example.com:8080/",
      "not a url",
    ]) {
      expect(() => parsePublicUrl(raw)).toThrow(SafeFetchError);
    }
  });
});
