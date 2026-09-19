import { describe, expect, it } from "vitest";

import {
  DEFAULT_NOTIFICATION_PREFS,
  parseNotificationPrefs,
  wantsNotification,
} from "./prefs";

describe("notification prefs", () => {
  it("fills defaults for missing or invalid payloads", () => {
    expect(parseNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs({ digest: { email: true } })).toEqual(
      DEFAULT_NOTIFICATION_PREFS,
    );
  });

  it("keeps a valid matrix", () => {
    const prefs = {
      ...DEFAULT_NOTIFICATION_PREFS,
      viewings: { email: false, whatsapp: true },
    };
    expect(parseNotificationPrefs(prefs)).toEqual(prefs);
    expect(wantsNotification(prefs, "viewings", "whatsapp")).toBe(true);
    expect(wantsNotification(prefs, "viewings", "email")).toBe(false);
    expect(wantsNotification(prefs, "digest", "email")).toBe(true);
  });
});
