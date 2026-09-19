import type { WorkspaceRole } from "@/lib/roles";

/**
 * Single authorization gate (docs/02 §3). Server code calls
 * `requireAbility(ctx, action)`; RLS mirrors the same matrix in Postgres.
 */
export type Action =
  | "workspace.read"
  | "workspace.update"
  | "workspace.delete"
  | "members.read"
  | "members.invite"
  | "members.update"
  | "members.remove"
  | "contacts.read"
  | "contacts.write"
  | "properties.read"
  | "properties.write"
  | "properties.delete"
  | "calendar.manage"
  | "pipeline.manage"
  | "inbox.read"
  | "inbox.write"
  | "tasks.read"
  | "tasks.write"
  | "integrations.manage"
  | "templates.manage"
  | "contracts.manage"
  | "ai.use"
  | "billing.manage";

const ALL: readonly Action[] = [
  "workspace.read",
  "workspace.update",
  "workspace.delete",
  "members.read",
  "members.invite",
  "members.update",
  "members.remove",
  "contacts.read",
  "contacts.write",
  "properties.read",
  "properties.write",
  "properties.delete",
  "calendar.manage",
  "pipeline.manage",
  "inbox.read",
  "inbox.write",
  "tasks.read",
  "tasks.write",
  "integrations.manage",
  "templates.manage",
  "contracts.manage",
  "ai.use",
  "billing.manage",
];

const ROLE_ABILITIES: Record<WorkspaceRole, ReadonlySet<Action>> = {
  owner: new Set(ALL),
  agent: new Set<Action>([
    "workspace.read",
    "members.read",
    "members.invite",
    "contacts.read",
    "contacts.write",
    "properties.read",
    "properties.write",
    "properties.delete",
    "calendar.manage",
    "pipeline.manage",
    "inbox.read",
    "inbox.write",
    "tasks.read",
    "tasks.write",
    "integrations.manage",
    "templates.manage",
    "contracts.manage",
    "ai.use",
  ]),
  assistant: new Set<Action>([
    "workspace.read",
    "members.read",
    "contacts.read",
    "contacts.write",
    "properties.read",
    "properties.write",
    "calendar.manage",
    "pipeline.manage",
    "inbox.read",
    "inbox.write",
    "tasks.read",
    "tasks.write",
    "ai.use",
  ]),
};

export type Membership = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
};

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(action: Action) {
    super(`Forbidden: ${action}`);
    this.name = "ForbiddenError";
  }
}

export function can(role: WorkspaceRole, action: Action): boolean {
  return ROLE_ABILITIES[role].has(action);
}

/**
 * Throws ForbiddenError unless the membership grants `action`.
 * `resource` is checked for workspace ownership when provided.
 */
export function requireAbility(
  membership: Membership,
  action: Action,
  resource?: { workspaceId: string },
): void {
  if (resource && resource.workspaceId !== membership.workspaceId) {
    throw new ForbiddenError(action);
  }
  if (!can(membership.role, action)) {
    throw new ForbiddenError(action);
  }
}

/** Only owners may change roles; nobody may demote the last owner (checked by caller). */
export function canAssignRole(
  actor: WorkspaceRole,
  target: WorkspaceRole,
): boolean {
  if (actor !== "owner") return false;
  return target === "owner" || target === "agent" || target === "assistant";
}
