import { describe, expect, it } from "vitest";

import {
  counterpartyEmail,
  isMailboxAddress,
  visibleGmailThreadMessage,
} from "@/lib/integrations/gmail/thread-messages";

describe("visibleGmailThreadMessage", () => {
  it("keeps inbox and sent messages", () => {
    expect(visibleGmailThreadMessage(["INBOX"])).toBe(true);
    expect(visibleGmailThreadMessage(["SENT"])).toBe(true);
    expect(visibleGmailThreadMessage(undefined)).toBe(true);
  });

  it("drops drafts, trash, and spam", () => {
    expect(visibleGmailThreadMessage(["DRAFT"])).toBe(false);
    expect(visibleGmailThreadMessage(["SENT", "TRASH"])).toBe(false);
    expect(visibleGmailThreadMessage(["SPAM"])).toBe(false);
  });
});

describe("counterpartyEmail", () => {
  it("skips the mailbox and keeps the other person", () => {
    expect(
      counterpartyEmail(
        "Samet <ozkalesamet@gmail.com>, Juuli Sadrak <juuli@example.com>",
        "ozkalesamet@gmail.com",
      ),
    ).toBe("juuli@example.com");
  });

  it("returns null when every address is the mailbox", () => {
    expect(
      counterpartyEmail("ozkalesamet@gmail.com", "Ozkalesamet@gmail.com"),
    ).toBe(null);
    expect(isMailboxAddress("Ozkalesamet@gmail.com", "ozkalesamet@gmail.com")).toBe(
      true,
    );
  });
});
