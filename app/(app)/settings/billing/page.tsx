import { and, count, eq, isNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { SettingsPage } from "@/components/settings/settings-chrome";
import { getQuota } from "@/lib/ai/quota";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { invites, properties, workspaceMembers } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { parsePlanId } from "@/lib/plans";
import { requireAbility } from "@/lib/permissions";

import { BillingPanel } from "./billing-panel";

export default async function SettingsBillingPage() {
  const t = await getTranslations("settings.billing");
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "billing.manage");

  const usage = await withUserContext(ctx.user.id, async (tx) => {
    const [[seats], [pending], [listings], quota] = await Promise.all([
      tx
        .select({ used: count() })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, ctx.workspace.id)),
      tx
        .select({ used: count() })
        .from(invites)
        .where(
          and(
            eq(invites.workspaceId, ctx.workspace.id),
            isNull(invites.acceptedAt),
          ),
        ),
      tx
        .select({ used: count() })
        .from(properties)
        .where(
          and(
            eq(properties.workspaceId, ctx.workspace.id),
            isNull(properties.deletedAt),
          ),
        ),
      getQuota(tx, ctx.workspace.id, ctx.workspace.timezone),
    ]);

    return {
      seatsUsed: Number(seats?.used ?? 0) + Number(pending?.used ?? 0),
      listingsUsed: Number(listings?.used ?? 0),
      quota,
    };
  });

  return (
    <SettingsPage title={t("title")}>
      <BillingPanel
        plan={parsePlanId(ctx.workspace.plan)}
        seatsUsed={usage.seatsUsed}
        listingsUsed={usage.listingsUsed}
        creditsRemaining={usage.quota.remaining}
        creditsLimit={usage.quota.limit}
        resetsLabel={formatDate(
          usage.quota.resetsAt,
          { day: "numeric", month: "short" },
          ctx.workspace.timezone,
        )}
      />
    </SettingsPage>
  );
}
