import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { IntegrationsPanel } from "@/components/inbox/integrations-panel";
import { SettingsPage } from "@/components/settings/settings-chrome";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { listIntegrations } from "@/lib/inbox/queries";
import {
  googleIncludesCalendar,
  googleIsDevMailbox,
} from "@/lib/integrations/google/calendar";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("settings");
  const ctx = await getAppContext();
  const { error } = await searchParams;
  const { rows, grant } = await withUserContext(ctx.user.id, async (tx) => {
    const [list, creds] = await Promise.all([
      listIntegrations(tx, ctx.user.id),
      tx
        .select({ credentials: integrations.credentials })
        .from(integrations)
        .where(
          and(
            eq(integrations.userId, ctx.user.id),
            eq(integrations.kind, "gmail"),
          ),
        )
        .limit(1),
    ]);
    return { rows: list, grant: creds[0]?.credentials ?? null };
  });
  const gmail = rows.find((r) => r.kind === "gmail") ?? null;
  const whatsapp = rows.find((r) => r.kind === "whatsapp") ?? null;
  const allowedError =
    error === "gmail_oauth" || error === "gmail_denied" ? error : null;

  return (
    <SettingsPage title={t("nav.integrations")}>
      <IntegrationsPanel
        gmail={gmail}
        whatsapp={whatsapp}
        role={ctx.membership.role}
        oauthError={allowedError}
        calendar={googleIncludesCalendar(grant)}
        dev={googleIsDevMailbox(grant)}
      />
    </SettingsPage>
  );
}
