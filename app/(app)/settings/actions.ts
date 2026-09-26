"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { getAppContext } from "@/lib/auth";
import { isAiLanguage } from "@/lib/ai/languages";
import { withUserContext } from "@/lib/db";
import { profiles, workspaces } from "@/lib/db/schema";
import { notificationPrefsSchema } from "@/lib/notifications/prefs";
import { PLAN_IDS } from "@/lib/plans";
import { ForbiddenError, requireAbility } from "@/lib/permissions";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  STORAGE_BUCKETS,
  createSignedUpload,
  removeObjects,
} from "@/lib/storage";
import {
  buildProfileAvatarPath,
  buildWorkspaceLogoPath,
  isProfileAvatarPath,
  isWorkspaceLogoPath,
} from "@/lib/storage-paths";
import { isValidTimezone } from "@/lib/timezones";

const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  legalName: z.string().trim().max(120).optional().or(z.literal("")),
  timezone: z.string().refine(isValidTimezone, "invalid_timezone"),
});

export type SettingsState = ActionResult;

export async function updateWorkspace(
  _prev: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "workspace.update");

  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName") ?? "",
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  await withUserContext(ctx.user.id, async (tx) => {
    await tx
      .update(workspaces)
      .set({
        name: parsed.data.name,
        legalName: parsed.data.legalName || null,
        timezone: parsed.data.timezone,
      })
      .where(eq(workspaces.id, ctx.workspace.id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: "workspace.updated",
        entity: "workspace",
        entityId: ctx.workspace.id,
        data: parsed.data,
      },
      tx,
    );
  });

  revalidatePath("/settings/workspace");
  revalidatePath("/", "layout");
  return actionOk();
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  signature: z.string().max(800).optional().or(z.literal("")),
});

export async function updateProfile(
  _prev: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await getAppContext();

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? "",
    signature: formData.get("signature") ?? "",
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  await withUserContext(ctx.user.id, async (tx) => {
    await tx
      .update(profiles)
      .set({
        fullName: parsed.data.fullName,
        phone: parsed.data.phone || null,
        aiSignature: parsed.data.signature || null,
      })
      .where(eq(profiles.id, ctx.user.id));
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return actionOk();
}

const imageUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

type SignedUploadResult = ActionResult<{ path: string; token: string }>;

function parseImageUpload(input: z.input<typeof imageUploadSchema>) {
  const parsed = imageUploadSchema.safeParse(input);
  if (!parsed.success) return null;
  if (
    !(AVATAR_MIME_TYPES as readonly string[]).includes(parsed.data.contentType)
  ) {
    return "unsupported_type" as const;
  }
  if (parsed.data.size > AVATAR_MAX_BYTES) return "too_large" as const;
  return parsed.data;
}

export async function createAvatarUploadUrl(
  input: z.input<typeof imageUploadSchema>,
): Promise<SignedUploadResult> {
  const ctx = await getAppContext();
  const parsed = parseImageUpload(input);
  if (parsed === null) return actionError("invalid");
  if (parsed === "unsupported_type" || parsed === "too_large") {
    return actionError(parsed);
  }

  const path = buildProfileAvatarPath(ctx.user.id, parsed.fileName);
  const signed = await createSignedUpload(STORAGE_BUCKETS.avatars, path);
  return actionOk(signed);
}

export async function attachAvatar(storagePath: string): Promise<ActionResult> {
  const ctx = await getAppContext();
  if (!isProfileAvatarPath(storagePath, ctx.user.id)) {
    return actionError("invalid");
  }

  const previous = await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .select({ avatarUrl: profiles.avatarUrl })
      .from(profiles)
      .where(eq(profiles.id, ctx.user.id))
      .limit(1);
    await tx
      .update(profiles)
      .set({ avatarUrl: storagePath })
      .where(eq(profiles.id, ctx.user.id));
    return row?.avatarUrl ?? null;
  });

  if (
    previous &&
    previous !== storagePath &&
    isProfileAvatarPath(previous, ctx.user.id)
  ) {
    await removeObjects(STORAGE_BUCKETS.avatars, [previous]);
  }

  revalidatePath("/", "layout");
  return actionOk();
}

export async function removeAvatar(): Promise<ActionResult> {
  const ctx = await getAppContext();
  const previous = await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .select({ avatarUrl: profiles.avatarUrl })
      .from(profiles)
      .where(eq(profiles.id, ctx.user.id))
      .limit(1);
    await tx
      .update(profiles)
      .set({ avatarUrl: null })
      .where(eq(profiles.id, ctx.user.id));
    return row?.avatarUrl ?? null;
  });

  if (previous && isProfileAvatarPath(previous, ctx.user.id)) {
    await removeObjects(STORAGE_BUCKETS.avatars, [previous]);
  }

  revalidatePath("/", "layout");
  return actionOk();
}

export async function createLogoUploadUrl(
  input: z.input<typeof imageUploadSchema>,
): Promise<SignedUploadResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "workspace.update");
  const parsed = parseImageUpload(input);
  if (parsed === null) return actionError("invalid");
  if (parsed === "unsupported_type" || parsed === "too_large") {
    return actionError(parsed);
  }

  const path = buildWorkspaceLogoPath(ctx.workspace.id, parsed.fileName);
  const signed = await createSignedUpload(STORAGE_BUCKETS.avatars, path);
  return actionOk(signed);
}

export async function attachLogo(storagePath: string): Promise<ActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "workspace.update");
  if (!isWorkspaceLogoPath(storagePath, ctx.workspace.id)) {
    return actionError("invalid");
  }

  const previous = await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .select({ logoUrl: workspaces.logoUrl })
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspace.id))
      .limit(1);
    await tx
      .update(workspaces)
      .set({ logoUrl: storagePath })
      .where(eq(workspaces.id, ctx.workspace.id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: "workspace.updated",
        entity: "workspace",
        entityId: ctx.workspace.id,
        data: { logo: true },
      },
      tx,
    );
    return row?.logoUrl ?? null;
  });

  if (
    previous &&
    previous !== storagePath &&
    isWorkspaceLogoPath(previous, ctx.workspace.id)
  ) {
    await removeObjects(STORAGE_BUCKETS.avatars, [previous]);
  }

  revalidatePath("/", "layout");
  return actionOk();
}

export async function removeLogo(): Promise<ActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "workspace.update");

  const previous = await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .select({ logoUrl: workspaces.logoUrl })
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspace.id))
      .limit(1);
    await tx
      .update(workspaces)
      .set({ logoUrl: null })
      .where(eq(workspaces.id, ctx.workspace.id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: "workspace.updated",
        entity: "workspace",
        entityId: ctx.workspace.id,
        data: { logo: false },
      },
      tx,
    );
    return row?.logoUrl ?? null;
  });

  if (previous && isWorkspaceLogoPath(previous, ctx.workspace.id)) {
    await removeObjects(STORAGE_BUCKETS.avatars, [previous]);
  }

  revalidatePath("/", "layout");
  return actionOk();
}

const aiPreferencesSchema = z.object({
  language: z.string().refine(isAiLanguage),
  tone: z.enum(["formal", "friendly", "short"]),
});

export async function updateAiPreferences(
  _prev: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "ai.use");

  const parsed = aiPreferencesSchema.safeParse({
    language: formData.get("language"),
    tone: formData.get("tone"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  await withUserContext(ctx.user.id, async (tx) => {
    await tx
      .update(profiles)
      .set({
        aiLanguage: parsed.data.language,
        aiTone: parsed.data.tone,
      })
      .where(eq(profiles.id, ctx.user.id));
  });

  revalidatePath("/settings/ai");
  revalidatePath("/", "layout");
  return actionOk();
}

const notificationSchema = z.object({
  prefs: z.string(),
});

export async function updateNotificationPreferences(
  _prev: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await getAppContext();
  const parsed = notificationSchema.safeParse({
    prefs: formData.get("prefs"),
  });
  if (!parsed.success) return actionError("invalid");

  let json: unknown;
  try {
    json = JSON.parse(parsed.data.prefs);
  } catch {
    return actionError("invalid");
  }
  const prefs = notificationPrefsSchema.safeParse(json);
  if (!prefs.success) return actionError("invalid");

  await withUserContext(ctx.user.id, async (tx) => {
    await tx
      .update(profiles)
      .set({
        notificationPrefs: prefs.data,
      })
      .where(eq(profiles.id, ctx.user.id));
  });

  revalidatePath("/settings/notifications");
  return actionOk();
}

const workspacePlanSchema = z.object({
  plan: z.enum(PLAN_IDS),
  interval: z.enum(["month", "year"]),
});

export async function selectWorkspacePlan(
  plan: string,
  interval: string,
): Promise<SettingsState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "billing.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const parsed = workspacePlanSchema.safeParse({ plan, interval });
  if (!parsed.success) return actionError("invalid");

  await withUserContext(ctx.user.id, async (tx) => {
    await tx
      .update(workspaces)
      .set({
        plan: parsed.data.plan,
        billingInterval: parsed.data.interval,
      })
      .where(eq(workspaces.id, ctx.workspace.id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: "workspace.updated",
        entity: "workspace",
        entityId: ctx.workspace.id,
        data: { plan: parsed.data.plan, interval: parsed.data.interval },
      },
      tx,
    );
  });

  revalidatePath("/settings/billing");
  revalidatePath("/settings/ai");
  revalidatePath("/", "layout");
  return actionOk();
}
