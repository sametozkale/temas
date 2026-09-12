"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { getAppContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { ingestInboundEmail } from "@/lib/inbox/ingest";
import { ingestInboundWhatsApp } from "@/lib/inbox/ingest-whatsapp";
import { inboundInjectSchema, whatsappInjectSchema } from "@/lib/inbox/schema";
import { ForbiddenError, requireAbility } from "@/lib/permissions";

export type IntegrationsState = ActionResult<{ conversationId?: string }>;

export async function connectGmailDev(): Promise<IntegrationsState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "integrations.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const mailbox = ctx.user.email?.toLowerCase();
  if (!mailbox) return actionError("no_email");

  const [upserted] = await db
    .insert(integrations)
    .values({
      workspaceId: ctx.workspace.id,
      kind: "gmail",
      status: "connected",
      credentials: { mode: "dev" },
      externalId: mailbox,
    })
    .onConflictDoUpdate({
      target: [integrations.workspaceId, integrations.kind],
      set: {
        status: "connected",
        credentials: { mode: "dev" },
        externalId: mailbox,
      },
    })
    .returning({ id: integrations.id });

  await logActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    action: "integration.connected",
    entity: "integration",
    entityId: upserted!.id,
    data: { kind: "gmail", mode: "dev", email: mailbox },
  });

  revalidatePath("/settings/integrations");
  revalidatePath("/inbox");
  revalidatePath("/", "layout");
  return actionOk();
}

export async function disconnectGmail(): Promise<IntegrationsState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "integrations.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const [row] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, ctx.workspace.id),
        eq(integrations.kind, "gmail"),
      ),
    )
    .limit(1);
  if (!row) return actionError("not_found");

  await db.delete(integrations).where(eq(integrations.id, row.id));
  await logActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    action: "integration.disconnected",
    entity: "integration",
    entityId: row.id,
    data: { kind: "gmail" },
  });

  revalidatePath("/settings/integrations");
  revalidatePath("/inbox");
  revalidatePath("/", "layout");
  return actionOk();
}

export async function injectInbound(
  _prev: IntegrationsState | undefined,
  formData: FormData,
): Promise<IntegrationsState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "integrations.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const parsed = inboundInjectSchema.safeParse({
    fromName: formData.get("fromName"),
    fromEmail: formData.get("fromEmail"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  const [gmail] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, ctx.workspace.id),
        eq(integrations.kind, "gmail"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!gmail) return actionError("not_connected");

  const from = `${parsed.data.fromName} <${parsed.data.fromEmail}>`;
  const result = await ingestInboundEmail({
    workspaceId: ctx.workspace.id,
    integrationId: gmail.id,
    from,
    subject: parsed.data.subject,
    body: parsed.data.body,
    externalId: `dev:${crypto.randomUUID()}`,
    sentAt: new Date(),
  });

  revalidatePath("/inbox");
  revalidatePath("/settings/integrations");
  revalidatePath("/", "layout");
  return actionOk({ conversationId: result.conversationId });
}

export async function connectWhatsAppDev(): Promise<IntegrationsState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "integrations.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const [upserted] = await db
    .insert(integrations)
    .values({
      workspaceId: ctx.workspace.id,
      kind: "whatsapp",
      status: "connected",
      credentials: { mode: "dev" },
      externalId: "dev",
    })
    .onConflictDoUpdate({
      target: [integrations.workspaceId, integrations.kind],
      set: {
        status: "connected",
        credentials: { mode: "dev" },
        externalId: "dev",
      },
    })
    .returning({ id: integrations.id });

  await logActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    action: "integration.connected",
    entity: "integration",
    entityId: upserted!.id,
    data: { kind: "whatsapp", mode: "dev" },
  });

  revalidatePath("/settings/integrations");
  revalidatePath("/inbox");
  revalidatePath("/", "layout");
  return actionOk();
}

export async function disconnectWhatsApp(): Promise<IntegrationsState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "integrations.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const [row] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, ctx.workspace.id),
        eq(integrations.kind, "whatsapp"),
      ),
    )
    .limit(1);
  if (!row) return actionError("not_found");

  await db.delete(integrations).where(eq(integrations.id, row.id));
  await logActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    action: "integration.disconnected",
    entity: "integration",
    entityId: row.id,
    data: { kind: "whatsapp" },
  });

  revalidatePath("/settings/integrations");
  revalidatePath("/inbox");
  revalidatePath("/", "layout");
  return actionOk();
}

export async function injectWhatsApp(
  _prev: IntegrationsState | undefined,
  formData: FormData,
): Promise<IntegrationsState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "integrations.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const parsed = whatsappInjectSchema.safeParse({
    fromName: formData.get("fromName"),
    fromPhone: formData.get("fromPhone"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  const [whatsapp] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, ctx.workspace.id),
        eq(integrations.kind, "whatsapp"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!whatsapp) return actionError("not_connected");

  const result = await ingestInboundWhatsApp({
    workspaceId: ctx.workspace.id,
    integrationId: whatsapp.id,
    from: parsed.data.fromPhone,
    profileName: parsed.data.fromName,
    body: parsed.data.body,
    externalId: `dev:wa:${crypto.randomUUID()}`,
    sentAt: new Date(),
  });

  revalidatePath("/inbox");
  revalidatePath("/settings/integrations");
  revalidatePath("/", "layout");
  return actionOk({ conversationId: result.conversationId });
}
