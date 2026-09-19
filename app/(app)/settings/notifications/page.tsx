import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { NotificationsForm } from "@/app/(app)/settings/notifications/notifications-form";
import { SettingsPage } from "@/components/settings/settings-chrome";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { parseNotificationPrefs } from "@/lib/notifications/prefs";

export default async function SettingsNotificationsPage() {
  const ctx = await getAppContext();
  const t = await getTranslations("settings.notifications");
  const [row] = await withUserContext(ctx.user.id, (tx) =>
    tx
      .select({
        prefs: profiles.notificationPrefs,
        phone: profiles.phone,
      })
      .from(profiles)
      .where(eq(profiles.id, ctx.user.id))
      .limit(1),
  );

  return (
    <SettingsPage title={t("title")}>
      <NotificationsForm
        prefs={parseNotificationPrefs(row?.prefs)}
        hasPhone={Boolean(row?.phone?.trim())}
      />
    </SettingsPage>
  );
}
