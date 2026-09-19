/**
 * Workspace plan catalog (docs/02 §3.1). The commercial unit is the workspace,
 * not the account: one login may sit on a Pro workspace and a Free workspace.
 * Limits are the source of truth for quota UI; hard enforcement (except AI
 * messages) and Stripe checkout are deferred. Settings > Billing already
 * shows the selected plan, this-cycle usage and invoices.
 */

export const PLAN_IDS = ["free", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type Plan = {
  id: PlanId;
  seats: number;
  properties: number;
  aiMessagesPerMonth: number;
  integrations: boolean;
  templates: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    seats: 3,
    properties: 10,
    aiMessagesPerMonth: 100,
    integrations: true,
    templates: true,
  },
  pro: {
    id: "pro",
    seats: 15,
    properties: 200,
    aiMessagesPerMonth: 2000,
    integrations: true,
    templates: true,
  },
};

export function parsePlanId(value: string | null | undefined): PlanId {
  return value === "pro" ? "pro" : "free";
}

export function getPlan(value: string | null | undefined): Plan {
  return PLANS[parsePlanId(value)];
}
