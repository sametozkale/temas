import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { NotificationsForm } from "@/app/(app)/settings/notifications/notifications-form";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export default async function SettingsNotificationsPage() {
  const ctx = await getAppContext();
  const t = await getTranslations("settings.notifications");
  const [prefs] = await withUserContext(ctx.user.id, (tx) =>
    tx
      .select({ digest: profiles.reminderDigestEnabled })
      .from(profiles)
      .where(eq(profiles.id, ctx.user.id))
      .limit(1),
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <NotificationsForm digestEnabled={prefs?.digest ?? true} />
    </div>
  );
}
