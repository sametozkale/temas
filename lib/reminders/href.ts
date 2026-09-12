export function reminderHref(
  kind: string | null,
  entity: string | null,
  entityId: string | null,
) {
  if (!entityId) return "/home";
  if (kind === "unanswered_message" || entity === "conversation") {
    return `/inbox/${entityId}`;
  }
  if (kind === "missing_deposit" || entity === "property") {
    return `/properties/${entityId}/edit`;
  }
  if (kind === "stale_applicant") return "/calendar";
  if (kind === "booking_soon" || kind === "viewing_followup") {
    return "/calendar";
  }
  return "/home";
}
