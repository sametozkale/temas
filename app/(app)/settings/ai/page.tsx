import { eq } from "drizzle-orm";

import { getQuota } from "@/lib/ai/quota";
import { isTextConfigured } from "@/lib/ai/models";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireAbility } from "@/lib/permissions";

import { AiPreferencesForm } from "./ai-form";

export default async function SettingsAiPage() {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "ai.use");

  const { prefs, quota } = await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .select({
        signature: profiles.aiSignature,
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
    <AiPreferencesForm
      signature={prefs?.signature ?? ""}
      language={prefs?.language ?? "en"}
      tone={prefs?.tone ?? "friendly"}
      used={quota.used}
      limit={quota.limit}
      configured={isTextConfigured()}
    />
  );
}
