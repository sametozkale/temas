import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "digest",
  "viewings",
  "viewing_reminders",
  "applications",
  "owner_decisions",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ["email", "whatsapp"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type ChannelPrefs = {
  email: boolean;
  whatsapp: boolean;
};

export type NotificationPrefs = Record<NotificationType, ChannelPrefs>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  digest: { email: true, whatsapp: false },
  viewings: { email: true, whatsapp: false },
  viewing_reminders: { email: true, whatsapp: false },
  applications: { email: true, whatsapp: false },
  owner_decisions: { email: true, whatsapp: false },
};

const channelSchema = z.object({
  email: z.boolean(),
  whatsapp: z.boolean(),
});

export const notificationPrefsSchema = z.object({
  digest: channelSchema,
  viewings: channelSchema,
  viewing_reminders: channelSchema,
  applications: channelSchema,
  owner_decisions: channelSchema,
}) satisfies z.ZodType<NotificationPrefs>;

export function parseNotificationPrefs(value: unknown): NotificationPrefs {
  const parsed = notificationPrefsSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  return DEFAULT_NOTIFICATION_PREFS;
}

export function wantsNotification(
  prefs: unknown,
  type: NotificationType,
  channel: NotificationChannel,
): boolean {
  return parseNotificationPrefs(prefs)[type][channel];
}

/** SQL default for `profiles.notification_prefs`. */
export const NOTIFICATION_PREFS_SQL_DEFAULT = JSON.stringify(
  DEFAULT_NOTIFICATION_PREFS,
);
