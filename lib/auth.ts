import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import {
  authUsers,
  profiles,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import type { Membership } from "@/lib/permissions";
import { avatarPublicUrl } from "@/lib/storage-constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ACTIVE_WORKSPACE_COOKIE = "temas_ws";
const LEGACY_WORKSPACE_COOKIE = "havn_ws";

const WORKSPACE_COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

type CookieStore = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string): void;
};

export function readWorkspaceCookie(store: CookieStore) {
  return (
    store.get(ACTIVE_WORKSPACE_COOKIE)?.value ??
    store.get(LEGACY_WORKSPACE_COOKIE)?.value
  );
}

export function writeWorkspaceCookie(store: CookieStore, workspaceId: string) {
  store.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, WORKSPACE_COOKIE_OPTS);
  store.delete(LEGACY_WORKSPACE_COOKIE);
}

export function clearWorkspaceCookie(store: CookieStore) {
  store.delete(ACTIVE_WORKSPACE_COOKIE);
  store.delete(LEGACY_WORKSPACE_COOKIE);
}

export type AuthUser = {
  id: string;
  email: string | null;
};

export type CurrentWorkspace = {
  id: string;
  name: string;
  legalName: string | null;
  slug: string;
  timezone: string;
  plan: string;
  logoUrl: string | null;
};

export type AppContext = {
  user: AuthUser;
  profile: {
    fullName: string | null;
    locale: string;
    avatarUrl: string | null;
  };
  workspace: CurrentWorkspace;
  membership: Membership;
  memberships: {
    workspaceId: string;
    name: string;
    role: Membership["role"];
    logoUrl: string | null;
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

/**
 * Auth cookie is valid, but this Postgres has no matching `auth.users` row
 * (typical when NEXT_PUBLIC_SUPABASE_* and DATABASE_URL point at different
 * projects). Clear the session so the user can sign in against the DB in use.
 */
export async function requirePersistedUser(next?: string): Promise<AuthUser> {
  const user = await requireUser(next);
  const [row] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.id, user.id))
    .limit(1);
  if (row) return user;

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  clearWorkspaceCookie(cookieStore);
  redirect("/login?error=session_mismatch");
}

const loadMemberships = cache(async (userId: string) => {
  return db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      role: workspaceMembers.role,
      name: workspaces.name,
      legalName: workspaces.legalName,
      slug: workspaces.slug,
      timezone: workspaces.timezone,
      plan: workspaces.plan,
      logoUrl: workspaces.logoUrl,
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
  const [memberships, profileRows, cookieStore] = await Promise.all([
    loadMemberships(user.id),
    db
      .select({
        fullName: profiles.fullName,
        locale: profiles.locale,
        avatarUrl: profiles.avatarUrl,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1),
    cookies(),
  ]);

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const preferred = readWorkspaceCookie(cookieStore);
  const active =
    memberships.find((m) => m.workspaceId === preferred) ?? memberships[0]!;
  const [profile] = profileRows;

  return {
    user,
    profile: profile
      ? {
          fullName: profile.fullName,
          locale: profile.locale,
          avatarUrl: avatarPublicUrl(profile.avatarUrl),
        }
      : { fullName: null, locale: "en", avatarUrl: null },
    workspace: {
      id: active.workspaceId,
      name: active.name,
      legalName: active.legalName,
      slug: active.slug,
      timezone: active.timezone,
      plan: active.plan,
      logoUrl: avatarPublicUrl(active.logoUrl),
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
      logoUrl: avatarPublicUrl(m.logoUrl),
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

export { firstNameOf, initialsOf } from "./auth-utils";
