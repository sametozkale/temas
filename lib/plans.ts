/**
 * Workspace plan catalog (docs/02 §3.1). The commercial unit is the workspace,
 * not the account: one login may sit on a Pro workspace and a Free workspace.
 * Limits and USD prices are the source of truth for quota and billing UI.
 * `free` is the Solo plan (one agent); `pro` is Team (per agent). Hard
 * enforcement (except AI messages) and Stripe checkout are deferred, so the
 * Monthly / Yearly switch changes the price, the credit line, and the listing
 * line shown. The allowance in force stays the monthly credit and listing
 * count until a yearly subscription is stored. Settings > Billing
 * already shows the selected plan, this-cycle usage and invoices.
 */

export const PLAN_IDS = ["free", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type BillingInterval = "month" | "year";

export type PlanPrice = {
  /** USD cents per month when billed month to month. */
  monthlyCents: number;
  /** USD cents per month when the year is paid up front. */
  annualMonthlyCents: number;
  /** Team multiplies by seat. Solo is one price for its single seat. */
  perSeat: boolean;
};

export type PlanCredits = {
  /** Credits per month when billed month to month. */
  month: number;
  /** Credits per month when the year is paid up front. */
  year: number;
};

export type PlanListings = {
  /** Active listings when billed month to month. Null means unlimited. */
  month: number | null;
  /** Active listings when the year is paid up front. Null means unlimited. */
  year: number | null;
  /** Team monthly cap is this many listings for each occupied seat. */
  perSeat: boolean;
};

export type Plan = {
  id: PlanId;
  seats: number;
  listings: PlanListings;
  credits: PlanCredits;
  integrations: boolean;
  templates: boolean;
  price: PlanPrice;
};

/** Credits per month for an interval. The live quota uses `"month"` until yearly billing is stored. */
export function planCredits(plan: Plan, interval: BillingInterval = "month") {
  return interval === "year" ? plan.credits.year : plan.credits.month;
}

/** Listing cap for an interval. Null is unlimited. */
export function planListings(plan: Plan, interval: BillingInterval = "month") {
  return {
    limit: interval === "year" ? plan.listings.year : plan.listings.month,
    perSeat: plan.listings.perSeat,
  };
}

/**
 * Listings the workspace may hold. Team monthly multiplies by occupied seats.
 * Null is unlimited. Defaults to the monthly cap until a yearly subscription is stored.
 */
export function listingCap(
  plan: Plan,
  seatsUsed: number,
  interval: BillingInterval = "month",
) {
  const quote = planListings(plan, interval);
  if (quote.limit == null) return null;
  if (!quote.perSeat) return quote.limit;
  return quote.limit * Math.max(seatsUsed, 1);
}

/** Whole-dollar catalog prices, e.g. 4900 → "$49". */
export function formatUsd(cents: number): string {
  return `$${cents / 100}`;
}

/** Monthly headline for an interval, plus the once-a-year total when yearly. */
export function planQuote(plan: Plan, interval: BillingInterval) {
  const monthlyCents =
    interval === "year" ? plan.price.annualMonthlyCents : plan.price.monthlyCents;
  return {
    monthlyCents,
    perSeat: plan.price.perSeat,
    annualCents: interval === "year" ? plan.price.annualMonthlyCents * 12 : null,
  };
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    seats: 1,
    listings: { month: 50, year: 100, perSeat: false },
    credits: { month: 500, year: 750 },
    integrations: true,
    templates: true,
    price: { monthlyCents: 4900, annualMonthlyCents: 2900, perSeat: false },
  },
  pro: {
    id: "pro",
    seats: 50,
    listings: { month: 200, year: null, perSeat: true },
    credits: { month: 750, year: 1000 },
    integrations: true,
    templates: true,
    price: { monthlyCents: 6900, annualMonthlyCents: 4900, perSeat: true },
  },
};

export function parsePlanId(value: string | null | undefined): PlanId {
  return value === "pro" ? "pro" : "free";
}

export function getPlan(value: string | null | undefined): Plan {
  return PLANS[parsePlanId(value)];
}
