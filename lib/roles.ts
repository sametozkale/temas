/** Role constants shared by schema, permissions and client components. */
export const WORKSPACE_ROLES = ["owner", "agent", "assistant"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const INVITE_ROLES = ["agent", "assistant"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

export const INVITE_TTL_DAYS = 7;
