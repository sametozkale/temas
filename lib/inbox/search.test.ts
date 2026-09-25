import { describe, expect, it } from "vitest";

import { conversationMatchesSearch } from "./search";

const item = {
  subject: "Keys for the Kadıköy flat",
  contactName: "Ayşe Yılmaz",
  contactEmail: "ayse@example.com",
};

describe("conversationMatchesSearch", () => {
  it("matches subject, sender name, or sender email", () => {
    expect(conversationMatchesSearch(item, "kadıköy")).toBe(true);
    expect(conversationMatchesSearch(item, "YILMAZ")).toBe(true);
    expect(conversationMatchesSearch(item, "yilmaz")).toBe(true);
    expect(conversationMatchesSearch(item, "ayse@example")).toBe(true);
  });

  it("ignores blank queries and misses unrelated text", () => {
    expect(conversationMatchesSearch(item, "   ")).toBe(true);
    expect(conversationMatchesSearch(item, "ryanair")).toBe(false);
  });
});
