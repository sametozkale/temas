import { describe, expect, it } from "vitest";

import { detectReminderSignals } from "./signals";

const now = new Date("2026-09-12T12:00:00Z");

describe("reminder signals", () => {
  it("flags a viewing 2 hours away", () => {
    const signals = detectReminderSignals({
      now,
      bookings: [
        {
          id: "b1",
          status: "confirmed",
          startsAt: new Date("2026-09-12T14:00:00Z"),
          contactId: "c1",
          contactName: "Elif",
          propertyId: "p1",
          propertyTitle: "Kadıköy bright 2+1",
        },
      ],
      messagesAfter: {},
      conversations: [],
      applications: [],
      properties: [],
      existing: [],
    });
    expect(signals.map((s) => s.kind)).toEqual(["booking_soon"]);
  });

  it("flags a silent prospect 24 hours after a viewing", () => {
    const signals = detectReminderSignals({
      now,
      bookings: [
        {
          id: "b1",
          status: "completed",
          startsAt: new Date("2026-09-11T10:00:00Z"),
          contactId: "c1",
          contactName: "Elif",
          propertyId: "p1",
          propertyTitle: "Kadıköy bright 2+1",
        },
      ],
      messagesAfter: { c1: new Date("2026-09-10T09:00:00Z") },
      conversations: [],
      applications: [],
      properties: [],
      existing: [],
    });
    expect(signals.map((s) => s.kind)).toEqual(["viewing_followup"]);
  });

  it("skips follow-up when the prospect already wrote", () => {
    const signals = detectReminderSignals({
      now,
      bookings: [
        {
          id: "b1",
          status: "completed",
          startsAt: new Date("2026-09-11T10:00:00Z"),
          contactId: "c1",
          contactName: "Elif",
          propertyId: "p1",
          propertyTitle: "Kadıköy bright 2+1",
        },
      ],
      messagesAfter: { c1: new Date("2026-09-11T16:00:00Z") },
      conversations: [],
      applications: [],
      properties: [],
      existing: [],
    });
    expect(signals).toEqual([]);
  });

  it("flags unanswered inbound mail after 7 days and stale applicants", () => {
    const signals = detectReminderSignals({
      now,
      bookings: [],
      messagesAfter: {},
      conversations: [
        {
          id: "conv1",
          lastDirection: "in",
          lastMessageAt: new Date("2026-09-01T12:00:00Z"),
          contactName: "Elif",
          propertyTitle: "Kadıköy bright 2+1",
        },
      ],
      applications: [
        {
          id: "a1",
          propertyId: "p1",
          propertyTitle: "Kadıköy bright 2+1",
          contactName: "Elif",
          stageChangedAt: new Date("2026-09-01T12:00:00Z"),
          isTerminal: false,
        },
      ],
      properties: [
        {
          id: "p2",
          title: "Moda studio",
          status: "rented",
          depositAmount: null,
        },
      ],
      existing: [],
    });
    expect(signals.map((s) => s.kind).sort()).toEqual([
      "missing_deposit",
      "stale_applicant",
      "unanswered_message",
    ]);
  });

  it("does not duplicate existing open reminders", () => {
    const signals = detectReminderSignals({
      now,
      bookings: [],
      messagesAfter: {},
      conversations: [],
      applications: [],
      properties: [
        {
          id: "p2",
          title: "Moda studio",
          status: "rented",
          depositAmount: null,
        },
      ],
      existing: [{ kind: "missing_deposit", entityId: "p2" }],
    });
    expect(signals).toEqual([]);
  });
});
