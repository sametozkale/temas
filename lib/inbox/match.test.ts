import { describe, expect, it } from "vitest";

import {
  matchContactId,
  matchPropertyId,
  normalizeSubject,
  parseFromHeader,
} from "./match";

describe("parseFromHeader", () => {
  it("reads name and email from a RFC header", () => {
    expect(parseFromHeader("Deniz Arslan <deniz@havn.test>")).toEqual({
      email: "deniz@havn.test",
      name: "Deniz Arslan",
    });
  });

  it("reads a bare address", () => {
    expect(parseFromHeader("mehmet@havn.test")).toEqual({
      email: "mehmet@havn.test",
      name: null,
    });
  });
});

describe("normalizeSubject", () => {
  it("strips reply prefixes", () => {
    expect(normalizeSubject("Re: Kadıköy bright 2+1")).toBe(
      "Kadıköy bright 2+1",
    );
  });
});

describe("matchContactId", () => {
  const contacts = [
    { id: "c1", email: "elif@havn.test", phone: "+905551110000" },
    { id: "c2", email: "mehmet@havn.test", phone: null },
  ];

  it("matches by email", () => {
    expect(matchContactId(contacts, "Elif@havn.test", null)).toBe("c1");
  });

  it("matches by phone suffix", () => {
    expect(matchContactId(contacts, null, "05551110000")).toBe("c1");
  });
});

describe("matchPropertyId", () => {
  const properties = [
    { id: "p1", title: "Kadıköy bright 2+1" },
    { id: "p2", title: "Beşiktaş office" },
  ];

  it("uses a single linked property", () => {
    expect(matchPropertyId(properties, ["p2"], "hello")).toBe("p2");
  });

  it("matches a title mentioned in the haystack", () => {
    expect(
      matchPropertyId(
        properties,
        [],
        "Viewing for Kadıköy bright 2+1 tomorrow",
      ),
    ).toBe("p1");
  });
});
