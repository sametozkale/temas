import { describe, expect, it } from "vitest";

import { parseGmailMessage } from "./parse";

describe("parseGmailMessage", () => {
  it("decodes a multipart payload", () => {
    const text = Buffer.from("Hello from Gmail").toString("base64url");
    const parsed = parseGmailMessage({
      id: "m1",
      threadId: "t1",
      internalDate: "1700000000000",
      payload: {
        headers: [
          { name: "From", value: "Elif Yılmaz <elif@temas.test>" },
          { name: "To", value: "ayse@temas.test" },
          { name: "Subject", value: "Kadıköy bright 2+1" },
          { name: "Message-ID", value: "<abc@mail.gmail.com>" },
        ],
        parts: [
          { mimeType: "text/plain", body: { data: text } },
          {
            mimeType: "text/html",
            body: {
              data: Buffer.from("<p>Hello from Gmail</p>").toString(
                "base64url",
              ),
            },
          },
        ],
      },
    });
    expect(parsed.body).toBe("Hello from Gmail");
    expect(parsed.from).toContain("elif@temas.test");
    expect(parsed.subject).toBe("Kadıköy bright 2+1");
    expect(parsed.threadId).toBe("t1");
    expect(parsed.sentAt.toISOString()).toBe(
      new Date(1700000000000).toISOString(),
    );
  });
});
