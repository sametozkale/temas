import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  listGoogleCalendars: vi.fn(),
  listGoogleColors: vi.fn(),
  listCalendarLabels: vi.fn(),
  listGoogleEvents: vi.fn(),
  persistGmailCredentials: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mocks.limit,
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/integrations/gmail/sync", () => ({
  asGmailCredentials: (raw: unknown) => raw ?? {},
  persistGmailCredentials: mocks.persistGmailCredentials,
}));

vi.mock("@/lib/integrations/google/calendar", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/integrations/google/calendar")
  >("@/lib/integrations/google/calendar");
  return {
    ...actual,
    listGoogleCalendars: mocks.listGoogleCalendars,
    listGoogleColors: mocks.listGoogleColors,
    listCalendarLabels: mocks.listCalendarLabels,
    listGoogleEvents: mocks.listGoogleEvents,
  };
});

import { loadGoogleOverlay } from "@/lib/calendar/google";
import { GoogleCalendarForbidden } from "@/lib/integrations/google/calendar";

const LIST_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly";

const primary = {
  id: "primary",
  name: "Samet",
  primary: true,
  color: "#039be5",
  writable: true,
};

function connected(scope?: string) {
  mocks.limit.mockResolvedValue([
    {
      id: "integration-1",
      credentials: {
        mode: "oauth",
        refreshToken: "refresh",
        accessToken: "access",
        expiry: new Date(Date.now() + 60 * 60_000).toISOString(),
        scope,
      },
    },
  ]);
}

function load() {
  return loadGoogleOverlay(
    "user-1",
    new Date("2026-10-01T00:00:00Z"),
    new Date("2026-11-01T00:00:00Z"),
    "Europe/Istanbul",
    (value) => value.toISOString(),
  );
}

describe("loadGoogleOverlay calendar list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.listGoogleColors.mockResolvedValue(new Map());
    mocks.listCalendarLabels.mockResolvedValue([]);
    mocks.listGoogleEvents.mockResolvedValue([]);
    mocks.persistGmailCredentials.mockResolvedValue(undefined);
    mocks.listGoogleCalendars.mockResolvedValue([primary]);
    connected(LIST_SCOPE);
  });

  it("keeps the calendar list when a later Google call is forbidden", async () => {
    mocks.listGoogleColors.mockRejectedValue(new GoogleCalendarForbidden());
    const overlay = await load();
    expect(overlay.status).toBe("ready");
    expect(overlay.calendars.map((calendar) => calendar.id)).toEqual([
      "primary",
    ]);
    expect(overlay.calendars[0]?.selected).toBe(true);
  });

  it("keeps the calendar list when one calendar's events are forbidden", async () => {
    mocks.listGoogleEvents.mockRejectedValue(new GoogleCalendarForbidden());
    const overlay = await load();
    expect(overlay.status).toBe("ready");
    expect(overlay.calendars).toHaveLength(1);
    expect(overlay.events).toEqual([]);
  });

  it("asks the user to reconnect when the list itself is forbidden", async () => {
    mocks.listGoogleCalendars.mockRejectedValue(new GoogleCalendarForbidden());
    const overlay = await load();
    expect(overlay.status).toBe("reconnect");
    expect(overlay.calendars).toEqual([]);
    expect(mocks.listGoogleColors).not.toHaveBeenCalled();
  });

  it("does not call Google for a calendar.events-only grant", async () => {
    connected("https://www.googleapis.com/auth/calendar.events");
    const overlay = await load();
    expect(overlay.status).toBe("reconnect");
    expect(mocks.listGoogleCalendars).not.toHaveBeenCalled();
  });

  it("still lists calendars when the stored grant omitted scope", async () => {
    connected(undefined);
    const overlay = await load();
    expect(overlay.status).toBe("ready");
    expect(mocks.listGoogleCalendars).toHaveBeenCalledOnce();
    expect(overlay.calendars).toHaveLength(1);
  });

  it("does not report a list failure as a disconnected account", async () => {
    mocks.listGoogleCalendars.mockRejectedValue(
      new Error("google_calendar_500"),
    );
    const overlay = await load();
    expect(overlay.status).toBe("reconnect");
  });
});
