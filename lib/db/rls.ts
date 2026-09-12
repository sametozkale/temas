import { sql, type SQL } from "drizzle-orm";
import { pgPolicy, type AnyPgColumn } from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

/**
 * RLS policy helpers (docs/03 §8, docs/02 §3 defense-in-depth).
 *
 * The SQL functions referenced here live in drizzle/0002_auth_helpers.sql:
 *   public.is_workspace_member(ws uuid)  -> boolean
 *   public.workspace_role(ws uuid)       -> text | null
 *   public.shares_workspace_with(u uuid) -> boolean
 * They are SECURITY DEFINER so policies on workspace_members do not recurse.
 */

export const WRITE_ROLES_ALL = ["owner", "agent", "assistant"] as const;
export const WRITE_ROLES_STAFF = ["owner", "agent"] as const;
export const WRITE_ROLES_OWNER = ["owner"] as const;

export { authenticatedRole, authUid };

export const isMember = (workspaceId: AnyPgColumn): SQL =>
  sql`public.is_workspace_member(${workspaceId})`;

export const hasRole = (
  workspaceId: AnyPgColumn,
  roles: readonly string[],
): SQL =>
  // Inline literals: policy DDL cannot carry bind parameters.
  sql`public.workspace_role(${workspaceId}) in (${sql.raw(
    roles.map((r) => `'${r.replace(/'/g, "''")}'`).join(", "),
  )})`;

/**
 * Standard policy set for a workspace-scoped table:
 * - members can SELECT
 * - the given roles can INSERT / UPDATE / DELETE
 */
export function workspacePolicies(
  table: string,
  workspaceId: AnyPgColumn,
  writeRoles: readonly string[] = WRITE_ROLES_ALL,
) {
  return [
    pgPolicy(`${table}_select_members`, {
      for: "select",
      to: authenticatedRole,
      using: isMember(workspaceId),
    }),
    pgPolicy(`${table}_insert_roles`, {
      for: "insert",
      to: authenticatedRole,
      withCheck: hasRole(workspaceId, writeRoles),
    }),
    pgPolicy(`${table}_update_roles`, {
      for: "update",
      to: authenticatedRole,
      using: hasRole(workspaceId, writeRoles),
      withCheck: hasRole(workspaceId, writeRoles),
    }),
    pgPolicy(`${table}_delete_roles`, {
      for: "delete",
      to: authenticatedRole,
      using: hasRole(workspaceId, writeRoles),
    }),
  ];
}
