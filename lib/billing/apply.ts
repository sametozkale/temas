import { eq } from "drizzle-orm";

import type { BillingGrant } from "@/lib/billing/events";
import type { DbOrTx } from "@/lib/db";
import { profiles, workspaces } from "@/lib/db/schema";

/** Writes the grant Stripe already confirmed. Called only from the webhook. */
export async function applyBillingGrant(tx: DbOrTx, grant: BillingGrant) {
  if (grant.kind === "workspace") {
    await tx
      .update(workspaces)
      .set({
        plan: grant.plan,
        billingInterval: grant.interval,
        billingStatus: grant.status,
        ...(grant.customerId ? { stripeCustomerId: grant.customerId } : {}),
        stripeSubscriptionId: grant.subscriptionId,
      })
      .where(eq(workspaces.id, grant.workspaceId));
    return;
  }
  await tx
    .update(profiles)
    .set({
      supportPlan: grant.plan,
      supportBilling: grant.billing,
      supportPeriodEndsAt: grant.periodEndsAt
        ? new Date(grant.periodEndsAt)
        : null,
      ...(grant.customerId ? { stripeCustomerId: grant.customerId } : {}),
      supportSubscriptionId: grant.subscriptionId,
    })
    .where(eq(profiles.id, grant.userId));
}
