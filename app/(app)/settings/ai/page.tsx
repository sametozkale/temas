import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { SettingsPage } from "@/components/settings/settings-chrome";
import { getQuota } from "@/lib/ai/quota";
import { normalizeAiLanguage } from "@/lib/ai/languages";
import { isTextConfigured } from "@/lib/ai/models";
import { getAppContext } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { withUserContext } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireAbility } from "@/lib/permissions";

import { AiPreferencesForm } from "./ai-form";

export default async function SettingsAiPage() {
  const t = await getTranslations("settings");
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "ai.use");

  const { prefs, quota } = await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .select({
        language: profiles.aiLanguage,
        tone: profiles.aiTone,
      })
      .from(profiles)
      .where(eq(profiles.id, ctx.user.id))
      .limit(1);
    return {
      prefs: row,
      quota: await getQuota(tx, ctx.workspace.id, ctx.workspace.timezone),
    };
  });

  return (
    <SettingsPage title={t("nav.ai")}>
      <AiPreferencesForm
        language={normalizeAiLanguage(prefs?.language)}
        tone={prefs?.tone ?? "friendly"}
        used={quota.used}
        limit={quota.limit}
        remaining={quota.remaining}
        exhausted={quota.exhausted}
        plan={quota.plan}
        resetsLabel={formatDate(
          quota.resetsAt,
          { day: "numeric", month: "short" },
          ctx.workspace.timezone,
        )}
        configured={isTextConfigured()}
      />
    </SettingsPage>
  );
}
