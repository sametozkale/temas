import { describe, expect, it } from "vitest";

import {
  inboxListFiltered,
  inboxListSearch,
  parseInboxChannel,
  parseInboxListFilters,
} from "./filters";

const ME = "11111111-1111-4111-8111-111111111111";
const AGENT = "22222222-2222-4222-8222-222222222222";

describe("parseInboxChannel", () => {
  it("maps gmail to the email channel", () => {
    expect(parseInboxChannel("gmail")).toBe("email");
    expect(parseInboxChannel("email")).toBe("email");
    expect(parseInboxChannel("whatsapp")).toBe("whatsapp");
    expect(parseInboxChannel("sms")).toBeUndefined();
  });
});

describe("parseInboxListFilters", () => {
  it("resolves me, a teammate, channel and unanswered together", () => {
    expect(
      parseInboxListFilters(
        { agent: "me", channel: "gmail", unanswered: "1" },
        ME,
      ),
    ).toEqual({
      assignedUserId: ME,
      channel: "email",
      unanswered: true,
    });
    expect(
      parseInboxListFilters({ agent: AGENT, channel: "whatsapp" }, ME),
    ).toEqual({
      assignedUserId: AGENT,
      channel: "whatsapp",
      unanswered: false,
    });
  });

  it("ignores a non-uuid agent value", () => {
    expect(parseInboxListFilters({ agent: "all" }, ME)).toEqual({
      assignedUserId: undefined,
      channel: undefined,
      unanswered: false,
    });
  });
});

describe("inboxListSearch", () => {
  it("keeps channel, unanswered and agent, and writes email as gmail", () => {
    expect(
      inboxListSearch({
        channel: "email",
        unanswered: "1",
        agent: "me",
      }),
    ).toBe("channel=gmail&unanswered=1&agent=me");
    expect(inboxListSearch({ channel: "sms" })).toBe("");
  });
});

describe("inboxListFiltered", () => {
  it("is true when any dimension is set", () => {
    expect(inboxListFiltered({})).toBe(false);
    expect(inboxListFiltered({ unanswered: true })).toBe(true);
    expect(inboxListFiltered({ channel: "email" })).toBe(true);
    expect(inboxListFiltered({ assignedUserId: ME })).toBe(true);
  });
});
