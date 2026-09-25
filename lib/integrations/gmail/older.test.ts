import { describe, expect, it } from "vitest";

import { gmailThreadStarred } from "@/lib/integrations/gmail/client";
import { gmailHasOlderMail } from "@/lib/integrations/gmail/sync";

describe("gmailThreadStarred", () => {
  it("is starred when any message in the thread still has the star", () => {
    expect(gmailThreadStarred([{ labelIds: ["INBOX"] }])).toBe(false);
    expect(
      gmailThreadStarred([
        { labelIds: ["INBOX"] },
        { labelIds: ["INBOX", "STARRED"] },
      ]),
    ).toBe(true);
  });
});

describe("gmailHasOlderMail", () => {
  it("keeps paging until Gmail reports no next page", () => {
    expect(gmailHasOlderMail({ refreshToken: "r" })).toBe(true);
    expect(
      gmailHasOlderMail({ refreshToken: "r", inboxPageToken: "next" }),
    ).toBe(true);
    expect(gmailHasOlderMail({ refreshToken: "r", inboxPageToken: "" })).toBe(
      false,
    );
    expect(gmailHasOlderMail({ mode: "dev", refreshToken: "r" })).toBe(false);
  });
});
