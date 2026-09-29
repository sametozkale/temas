/**
 * Risk tier for every Ask write tool (docs/05-ai-features.md §2.5).
 * Server-owned: the model cannot change it. Read and lookup tools are
 * not listed and run without approval.
 */
export const AUTO_ACTIONS = [
  "createTask",
  "updateTask",
  "setTaskDone",
  "acceptTask",
  "dismissTask",
  "updatePropertyFields",
  "changePropertyStatus",
  "saveInventoryItem",
  "addPropertyPerson",
  "setCoverPhoto",
  "moveApplication",
  "addPipelineStage",
  "renamePipelineStage",
  "draftReply",
  "saveContractBody",
  "setGoogleEventColor",
  "updateProfile",
  "updateAiPreferences",
  "updateNotificationPreference",
  "linkConversationToProperty",
  "previewListingImport",
  "openInProduct",
] as const;

export const APPROVAL_ACTIONS = [
  "createProperty",
  "deleteProperty",
  "deleteInventoryItem",
  "removePropertyPerson",
  "createPersonInviteLink",
  "removePhoto",
  "setDocumentShared",
  "deleteDocument",
  "attachChatFiles",
  "setFormPublished",
  "rotateOwnerLink",
  "createViewingCalendar",
  "updateCalendarSettings",
  "setAgentAvailability",
  "bookViewing",
  "cancelViewing",
  "rescheduleViewing",
  "sendReply",
  "sendEmail",
  "createContract",
  "acknowledgeContractDisclaimer",
  "exportContract",
  "updateWorkspace",
  "selectWorkspacePlan",
  "inviteMember",
  "revokeInvite",
  "updateMemberRole",
  "removeMember",
  "saveContractTemplate",
  "restoreContractTemplate",
  "selectSupportPlan",
  "sendPriorityNote",
  "disconnectIntegration",
] as const;

/** Mailbox actions that need a confirmation; the rest run at once. */
const RISKY_MAILBOX_ACTIONS = new Set(["spam", "trash"]);

export const ACTION_TOOL_NAMES = new Set<string>([
  ...AUTO_ACTIONS,
  ...APPROVAL_ACTIONS,
  "manageMailbox",
]);

/** Write tools the chat renders as action cards; the listing preview stays silent. */
export const CARD_TOOL_NAMES = new Set<string>(
  [...ACTION_TOOL_NAMES].filter((name) => name !== "previewListingImport"),
);

const approvalSet = new Set<string>(APPROVAL_ACTIONS);

export function needsApproval(toolName: string, input: unknown): boolean {
  if (approvalSet.has(toolName)) return true;
  if (toolName === "manageMailbox") {
    const action = (input as { action?: unknown } | null)?.action;
    return typeof action === "string" && RISKY_MAILBOX_ACTIONS.has(action);
  }
  return false;
}
