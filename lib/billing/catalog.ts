/**
 * Stripe price lookup keys. Create these prices in the Stripe dashboard
 * later; checkout will ask for the lookup key, not a hard-coded price id.
 * Workspace plans are subscriptions. Support "Buy for one month" is one
 * payment. Support "Subscribe" is a monthly subscription.
 */

import type { BillingInterval, PlanId } from "@/lib/plans";
import type { SupportPlanId } from "@/lib/support";

export type StripeBillingMode = "subscription" | "payment";

export type WorkspacePriceKey =
  | "plan_free_month"
  | "plan_free_year"
  | "plan_pro_month"
  | "plan_pro_year";

export type SupportPriceKey =
  | "support_founder_month"
  | "support_founder_subscribe"
  | "support_priority_month"
  | "support_priority_subscribe";

export type StripePriceKey = WorkspacePriceKey | SupportPriceKey;

export function workspacePriceKey(
  plan: PlanId,
  interval: BillingInterval,
): WorkspacePriceKey {
  if (plan === "pro") return interval === "year" ? "plan_pro_year" : "plan_pro_month";
  return interval === "year" ? "plan_free_year" : "plan_free_month";
}

/** Team prices are per seat. Solo is quantity 1. */
export function workspaceSeatQuantity(plan: PlanId, seats: number): number {
  return plan === "pro" ? Math.max(seats, 1) : 1;
}

export function supportPriceKey(
  plan: Exclude<SupportPlanId, "included">,
  mode: "month" | "subscribe",
): SupportPriceKey {
  if (plan === "founder") {
    return mode === "month" ? "support_founder_month" : "support_founder_subscribe";
  }
  return mode === "month" ? "support_priority_month" : "support_priority_subscribe";
}

export function supportCheckoutMode(mode: "month" | "subscribe"): StripeBillingMode {
  return mode === "month" ? "payment" : "subscription";
}
