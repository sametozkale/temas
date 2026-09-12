"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/action-result";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_WORKSPACE_COOKIE);
  redirect("/login");
}

/** Sign out and continue to a same-origin path (used to switch accounts on invite pages). */
export async function signOutTo(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? ""), "/login");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_WORKSPACE_COOKIE);
  redirect(next);
}

export async function switchWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/home");
}
