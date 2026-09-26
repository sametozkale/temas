import { z } from "zod";

/**
 * Account support add-ons (Settings > Support). Stored on `profiles.support_plan`.
 * Prices are monthly USD cents. Checkout is later; choosing a plan only saves it.
 */

export const SUPPORT_PLAN_IDS = ["included", "founder", "priority"] as const;

export type SupportPlanId = (typeof SUPPORT_PLAN_IDS)[number];

/** Founder inbox for mailto and Priority notes. */
export const SUPPORT_EMAIL = "ozkalesamet@gmail.com";

export const SUPPORT_PRICES: Record<SupportPlanId, number> = {
  included: 0,
  founder: 900,
  priority: 2900,
};

export function parseSupportPlan(
  value: string | null | undefined,
): SupportPlanId {
  return value === "founder" || value === "priority" ? value : "included";
}

/** The founder number is for Founder and Priority. */
export function supportHasWhatsapp(plan: SupportPlanId) {
  return plan === "founder" || plan === "priority";
}

export function supportMailto() {
  const subject = encodeURIComponent("Temas support");
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
}

export const supportPlanSchema = z.object({
  plan: z.enum(SUPPORT_PLAN_IDS),
});

export const priorityNoteSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(8).max(4000),
});
