/**
 * What each AI action costs against the workspace monthly allowance
 * (`lib/plans.ts`). A normal Home question is 1 credit. Background jobs
 * that the user did not ask for cost nothing. Heavier writes cost more.
 * Stripe does not sell credits; the plan's monthly allowance is the cap.
 */

export const CREDIT_ACTIONS = [
  "ask",
  "draft",
  "contract",
  "applicant_summary",
  "thread_title",
  "task_extract",
  "auto_link",
  "embedding",
  "reminder_copy",
] as const;

export type CreditAction = (typeof CREDIT_ACTIONS)[number];

export const CREDIT_COSTS: Record<CreditAction, number> = {
  /** One Home / Ask question. */
  ask: 1,
  /** Inbox "Draft with AI". */
  draft: 3,
  /** Contract mode, both stages. */
  contract: 8,
  /** Applicant summary on a form submission. */
  applicant_summary: 2,
  /** Naming a new Ask thread. Not charged. */
  thread_title: 0,
  /** Inbox task extract. Not charged. */
  task_extract: 0,
  /** Matching an inbound message to a property. Not charged. */
  auto_link: 0,
  /** Embedding pipeline. Not charged. */
  embedding: 0,
  /** Reminder copy. Not charged. */
  reminder_copy: 0,
};

export function creditCost(action: CreditAction): number {
  return CREDIT_COSTS[action];
}
