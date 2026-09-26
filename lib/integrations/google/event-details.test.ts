import { describe, expect, it } from "vitest";

import { readGoogleEventDetails, safeHttpUrl } from "./event-details";

describe("readGoogleEventDetails", () => {
  it("keeps the Meet link, guests and description", () => {
    const details = readGoogleEventDetails({
      description: "Bring the keys.",
      hangoutLink: "https://meet.google.com/abc-defg-hij",
      htmlLink: "https://www.google.com/calendar/event?eid=1",
      attendees: [
        {
          email: "samet@example.com",
          displayName: "Samet",
          responseStatus: "accepted",
          self: true,
        },
        {
          email: "owner@example.com",
          displayName: "Owner",
          responseStatus: "needsAction",
          organizer: true,
        },
      ],
    });
    expect(details.meetUrl).toBe("https://meet.google.com/abc-defg-hij");
    expect(details.description).toBe("Bring the keys.");
    expect(details.guests.map((guest) => guest.email)).toEqual([
      "owner@example.com",
      "samet@example.com",
    ]);
    expect(details.guests[0]?.organizer).toBe(true);
  });

  it("prefers the video conference link and drops unsafe urls", () => {
    const details = readGoogleEventDetails({
      hangoutLink: "javascript:alert(1)",
      conferenceData: {
        entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/xyz" }],
      },
    });
    expect(details.meetUrl).toBe("https://meet.google.com/xyz");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
  });
});
