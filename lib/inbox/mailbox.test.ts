import { describe, expect, it } from "vitest";

import { gmailLabelChange } from "@/lib/inbox/mailbox";

describe("gmailLabelChange", () => {
  it("archives by leaving the inbox", () => {
    expect(gmailLabelChange("archive")).toEqual({
      removeLabelIds: ["INBOX"],
    });
  });

  it("reports spam and drops the inbox label", () => {
    expect(gmailLabelChange("spam")).toEqual({
      addLabelIds: ["SPAM"],
      removeLabelIds: ["INBOX"],
    });
  });

  it("marks unread and toggles the star", () => {
    expect(gmailLabelChange("unread")).toEqual({ addLabelIds: ["UNREAD"] });
    expect(gmailLabelChange("star")).toEqual({ addLabelIds: ["STARRED"] });
    expect(gmailLabelChange("unstar")).toEqual({
      removeLabelIds: ["STARRED"],
    });
  });
});
