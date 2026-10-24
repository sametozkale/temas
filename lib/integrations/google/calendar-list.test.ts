import { afterEach, describe, expect, it, vi } from "vitest";

import type { GmailCredentials } from "@/lib/integrations/gmail/client";
import {
  calendarListPath,
  listGoogleCalendars,
  readGoogleCalendarList,
} from "@/lib/integrations/google/calendar";

describe("readGoogleCalendarList", () => {
  it("keeps hidden and unchecked calendars and drops deleted ones", () => {
    const calendars = readGoogleCalendarList([
      {
        id: "primary",
        summary: "Samet",
        primary: true,
        backgroundColor: "#039be5",
        accessRole: "owner",
        hidden: true,
        selected: false,
      },
      {
        id: "team",
        summary: "team@example.com",
        summaryOverride: "Lettings",
        accessRole: "writerWithoutPrivateAccess",
        selected: false,
      },
      { id: "gone", summary: "Old", deleted: true, accessRole: "owner" },
      { id: "primary", summary: "duplicate" },
      { summary: "no id" },
    ]);

    expect(calendars.map((calendar) => calendar.id)).toEqual([
      "primary",
      "team",
    ]);
    expect(calendars[0]).toMatchObject({
      name: "Samet",
      primary: true,
      color: "#039be5",
      writable: true,
    });
    expect(calendars[1]).toMatchObject({
      name: "Lettings",
      writable: true,
      primary: false,
    });
  });
});

describe("calendarListPath", () => {
  it("includes hidden calendars and does not filter by access role", () => {
    const path = calendarListPath();
    expect(path).toContain("showHidden=true");
    expect(path).toContain("showDeleted=false");
    expect(path).not.toContain("minAccessRole");
    expect(calendarListPath("page-2")).toContain("pageToken=page-2");
  });
});

describe("listGoogleCalendars", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows an empty first page to the calendars on the next page", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("pageToken=page-2")) {
        return Response.json({
          items: [
            {
              id: "primary",
              summary: "Samet",
              primary: true,
              accessRole: "owner",
              hidden: true,
              selected: false,
            },
          ],
        });
      }
      return Response.json({ items: [], nextPageToken: "page-2" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const credentials: GmailCredentials = {
      mode: "oauth",
      accessToken: "access-token",
      expiry: new Date(Date.now() + 60 * 60_000).toISOString(),
      refreshToken: "refresh-token",
    };
    const calendars = await listGoogleCalendars(credentials);

    expect(calendars.map((calendar) => calendar.id)).toEqual(["primary"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = String(fetchMock.mock.calls[0]?.[0]);
    expect(first).toContain("/users/me/calendarList?");
    expect(first).toContain("showHidden=true");
    expect(first).not.toContain("minAccessRole");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("pageToken=page-2");
  });
});
