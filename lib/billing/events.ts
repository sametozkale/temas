/**
 * Turns a Stripe webhook object into the rows Temas stores.
 * The route verifies the signature first. Checkout is not called from here.
 */

import { parseBillingInterval, parsePlanId, type BillingInterval, type PlanId } from "@/lib/plans";
import { parseSupportPlan, type SupportPlanId } from "@/lib/support";

export type BillingStatus = "none" | "active" | "past_due" | "canceled";

export type WorkspaceGrant = {
  kind: "workspace";
  workspaceId: string;
  plan: PlanId;
  interval: BillingInterval;
  status: BillingStatus;
  customerId: string | null;
  subscriptionId: string | null;
};

export type SupportGrant = {
  kind: "support";
  userId: string;
  plan: SupportPlanId;
  billing: "none" | "month" | "subscribe";
  periodEndsAt: string | null;
  customerId: string | null;
  subscriptionId: string | null;
};

export type BillingGrant = WorkspaceGrant | SupportGrant;

type StripeObject = {
  id?: string;
  object?: string;
  mode?: string;
  customer?: string | { id?: string } | null;
  subscription?: string | null;
  status?: string;
  metadata?: Record<string, string> | null;
  current_period_end?: number | null;
  client_reference_id?: string | null;
};

export type StripeEvent = {
  type: string;
  data?: { object?: StripeObject };
};

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function customerId(value: StripeObject["customer"]): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : (value.id ?? null);
}

function statusOf(value: string | undefined): BillingStatus {
  if (value === "active" || value === "trialing") return "active";
  if (value === "past_due") return "past_due";
  if (value === "canceled" || value === "unpaid" || value === "incomplete_expired") {
    return "canceled";
  }
  return "none";
}

function periodEndIso(unixSeconds: number | null | undefined, now: number): string {
  if (unixSeconds) return new Date(unixSeconds * 1000).toISOString();
  return new Date(now + MONTH_MS).toISOString();
}

function workspaceGrant(
  meta: Record<string, string>,
  status: BillingStatus,
  customer: string | null,
  subscriptionId: string | null,
): WorkspaceGrant | null {
  if (!meta.workspace_id) return null;
  return {
    kind: "workspace",
    workspaceId: meta.workspace_id,
    plan: status === "canceled" ? "free" : parsePlanId(meta.plan),
    interval: status === "canceled" ? "month" : parseBillingInterval(meta.interval),
    status,
    customerId: customer,
    subscriptionId: status === "canceled" ? null : subscriptionId,
  };
}

function supportGrant(
  meta: Record<string, string>,
  billing: SupportGrant["billing"],
  status: BillingStatus,
  customer: string | null,
  subscriptionId: string | null,
  periodEndsAt: string | null,
): SupportGrant | null {
  if (!meta.user_id) return null;
  const canceled = status === "canceled";
  return {
    kind: "support",
    userId: meta.user_id,
    plan: canceled ? "included" : parseSupportPlan(meta.support_plan),
    billing: canceled ? "none" : billing,
    periodEndsAt: canceled ? null : periodEndsAt,
    customerId: customer,
    subscriptionId: canceled ? null : subscriptionId,
  };
}

/** Metadata the Checkout Session must carry. Stripe products are created later. */
export function applyStripeEvent(event: StripeEvent, now = Date.now()): BillingGrant | null {
  const object = event.data?.object;
  if (!object) return null;
  const meta = object.metadata ?? {};
  const customer = customerId(object.customer);

  if (event.type === "checkout.session.completed" && meta.kind === "workspace") {
    return workspaceGrant(meta, "active", customer, object.subscription ?? null);
  }

  if (event.type === "checkout.session.completed" && meta.kind === "support") {
    const billing = object.mode === "payment" ? "month" : "subscribe";
    return supportGrant(
      meta,
      billing,
      "active",
      customer,
      object.subscription ?? null,
      periodEndIso(object.current_period_end, now),
    );
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const status =
      event.type === "customer.subscription.deleted"
        ? "canceled"
        : statusOf(object.status);
    if (meta.kind === "workspace") {
      return workspaceGrant(
        meta,
        status,
        customer,
        status === "canceled" ? null : (object.id ?? null),
      );
    }
    if (meta.kind === "support") {
      return supportGrant(
        meta,
        "subscribe",
        status,
        customer,
        status === "canceled" ? null : (object.id ?? null),
        status === "canceled" ? null : periodEndIso(object.current_period_end, now),
      );
    }
  }

  return null;
}
