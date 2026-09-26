import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { SettingsPage } from "@/components/settings/settings-chrome";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireAbility } from "@/lib/permissions";
import {
  SUPPORT_WHATSAPP_DISPLAY,
  supportWhatsappUrl,
} from "@/lib/support-whatsapp";
import { parseSupportPlan, supportHasWhatsapp } from "@/lib/support";

import { SupportPanel } from "./support-panel";

export default async function SettingsSupportPage() {
  const t = await getTranslations("settings.support");
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "workspace.read");

  const [row] = await withUserContext(ctx.user.id, (tx) =>
    tx
      .select({ supportPlan: profiles.supportPlan })
      .from(profiles)
      .where(eq(profiles.id, ctx.user.id))
      .limit(1),
  );
  const plan = parseSupportPlan(row?.supportPlan);

  return (
    <SettingsPage title={t("title")}>
      <SupportPanel
        plan={plan}
        whatsappPhone={
          supportHasWhatsapp(plan) ? SUPPORT_WHATSAPP_DISPLAY : null
        }
        whatsappHref={supportHasWhatsapp(plan) ? supportWhatsappUrl() : null}
      />
    </SettingsPage>
  );
}
