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

/** Membership check for tables that only carry `property_id` (drizzle/0006). */
export const isPropertyMember = (propertyId: AnyPgColumn): SQL =>
  sql`public.is_workspace_member(public.property_workspace(${propertyId}))`;

export const hasPropertyRole = (
  propertyId: AnyPgColumn,
  roles: readonly string[],
): SQL =>
  sql`public.workspace_role(public.property_workspace(${propertyId})) in (${sql.raw(
    roles.map((r) => `'${r.replace(/'/g, "''")}'`).join(", "),
  )})`;

/** Caller is a joined owner / current_tenant of the property (docs/03 §8). */
export const isPropertyPerson = (propertyId: AnyPgColumn): SQL =>
  sql`public.is_property_person(${propertyId})`;

/**
 * Policy set for a property child table (property_media, inventory_items, …):
 * - workspace members can SELECT; linked people get a restricted SELECT when
 *   `peopleSelect` is provided (defaults to no external access)
 * - the given roles can INSERT / UPDATE / DELETE
 */
export function propertyChildPolicies(
  table: string,
  propertyId: AnyPgColumn,
  options: {
    writeRoles?: readonly string[];
    /** Extra condition granting SELECT to property people; `true` = all rows. */
    peopleSelect?: SQL | true;
  } = {},
) {
  const writeRoles = options.writeRoles ?? WRITE_ROLES_ALL;
  const peopleClause =
    options.peopleSelect === undefined
      ? undefined
      : options.peopleSelect === true
        ? isPropertyPerson(propertyId)
        : sql`(${isPropertyPerson(propertyId)} and ${options.peopleSelect})`;
  const selectUsing = peopleClause
    ? sql`(${isPropertyMember(propertyId)} or ${peopleClause})`
    : isPropertyMember(propertyId);

  return [
    pgPolicy(`${table}_select_members`, {
      for: "select",
      to: authenticatedRole,
      using: selectUsing,
    }),
    pgPolicy(`${table}_insert_roles`, {
      for: "insert",
      to: authenticatedRole,
      withCheck: hasPropertyRole(propertyId, writeRoles),
    }),
    pgPolicy(`${table}_update_roles`, {
      for: "update",
      to: authenticatedRole,
      using: hasPropertyRole(propertyId, writeRoles),
      withCheck: hasPropertyRole(propertyId, writeRoles),
    }),
    pgPolicy(`${table}_delete_roles`, {
      for: "delete",
      to: authenticatedRole,
      using: hasPropertyRole(propertyId, writeRoles),
    }),
  ];
}

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
