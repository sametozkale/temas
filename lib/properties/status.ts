import {
  PROPERTY_STATUSES,
  type PropertyStatus,
} from "@/lib/db/schema/properties";

/**
 * Property lifecycle state machine (docs/00 §8):
 *   draft → active → viewing_in_progress → application_review → contract_pending → rented → archived
 *
 * Forward moves follow the funnel; every non-archived status can step back one
 * stage (a deal falling through) or be archived. Archived properties can be
 * re-listed as draft. Every accepted transition must be written to activity_log.
 */
const TRANSITIONS: Record<PropertyStatus, readonly PropertyStatus[]> = {
  draft: ["active", "archived"],
  active: ["viewing_in_progress", "draft", "archived"],
  viewing_in_progress: ["application_review", "active", "archived"],
  application_review: ["contract_pending", "viewing_in_progress", "archived"],
  contract_pending: ["rented", "application_review", "archived"],
  rented: ["active", "archived"],
  archived: ["draft"],
};

/** Ordered funnel position; used for progress rendering. */
export const STATUS_ORDER: readonly PropertyStatus[] = PROPERTY_STATUSES;

export function isPropertyStatus(value: unknown): value is PropertyStatus {
  return (
    typeof value === "string" &&
    (PROPERTY_STATUSES as readonly string[]).includes(value)
  );
}

export function nextStatuses(from: PropertyStatus): readonly PropertyStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: PropertyStatus, to: PropertyStatus) {
  return from !== to && TRANSITIONS[from].includes(to);
}

/** Statuses that count as "on the market" for list filters and Home summaries. */
export const LISTED_STATUSES: readonly PropertyStatus[] = [
  "active",
  "viewing_in_progress",
  "application_review",
  "contract_pending",
];

/** Badge tone per status (docs/01 §8 token mapping). */
export const STATUS_TONE: Record<
  PropertyStatus,
  "secondary" | "brand" | "info" | "warning" | "success" | "outline"
> = {
  draft: "secondary",
  active: "brand",
  viewing_in_progress: "info",
  application_review: "info",
  contract_pending: "warning",
  rented: "success",
  archived: "outline",
};
