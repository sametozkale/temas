import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import { profiles, workspaceMembers, workspaces } from "@/lib/db/schema";
import type { Membership } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ACTIVE_WORKSPACE_COOKIE = "havn_ws";

export type AuthUser = {
  id: string;
  email: string | null;
};

export type CurrentWorkspace = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  plan: string;
};

export type AppContext = {
  user: AuthUser;
  profile: { fullName: string | null; locale: string };
  workspace: CurrentWorkspace;
  membership: Membership;
  memberships: {
    workspaceId: string;
    name: string;
    role: Membership["role"];
  }[];
};

/** Current Supabase auth user, or null. Cached per request. */
export const getUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
});

/** Redirects to /login when unauthenticated. */
export async function requireUser(next?: string): Promise<AuthUser> {
  const user = await getUser();
  if (!user) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return user;
}

const loadMemberships = cache(async (userId: string) => {
  return db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      role: workspaceMembers.role,
      name: workspaces.name,
      slug: workspaces.slug,
      timezone: workspaces.timezone,
      plan: workspaces.plan,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.createdAt);
});

/**
 * Resolves user + active workspace + membership. Redirects to /login when
 * signed out and to /onboarding when the user has no workspace yet.
 */
export const getAppContext = cache(async (): Promise<AppContext> => {
  const user = await requireUser();
  const memberships = await loadMemberships(user.id);

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const active =
    memberships.find((m) => m.workspaceId === preferred) ?? memberships[0]!;

  const [profile] = await db
    .select({ fullName: profiles.fullName, locale: profiles.locale })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return {
    user,
    profile: profile ?? { fullName: null, locale: "en" },
    workspace: {
      id: active.workspaceId,
      name: active.name,
      slug: active.slug,
      timezone: active.timezone,
      plan: active.plan,
    },
    membership: {
      workspaceId: active.workspaceId,
      userId: user.id,
      role: active.role,
    },
    memberships: memberships.map((m) => ({
      workspaceId: m.workspaceId,
      name: m.name,
      role: m.role,
    })),
  };
});

export async function hasAnyWorkspace(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);
  return Boolean(row);
}

/** Membership lookup for a specific workspace (used by actions with explicit ids). */
export async function getMembership(
  userId: string,
  workspaceId: string,
): Promise<Membership | null> {
  const [row] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return row ? { userId, workspaceId, role: row.role } : null;
}

export { initialsOf } from "./auth-utils";
