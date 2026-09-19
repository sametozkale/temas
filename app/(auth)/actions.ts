"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/action-result";
import {
  clearWorkspaceCookie,
  getMembership,
  requireUser,
  writeWorkspaceCookie,
} from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  clearWorkspaceCookie(cookieStore);
  redirect("/login");
}

/** Sign out and continue to a same-origin path (used to switch accounts on invite pages). */
export async function signOutTo(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? ""), "/login");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  clearWorkspaceCookie(cookieStore);
  redirect(next);
}

export async function switchWorkspace(workspaceId: string) {
  const user = await requireUser();
  const membership = await getMembership(user.id, workspaceId);
  if (!membership) {
    redirect("/home");
  }
  const cookieStore = await cookies();
  writeWorkspaceCookie(cookieStore, workspaceId);
  redirect("/home");
}
