"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { getAppContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { clientIp } from "@/lib/http";
import { ingestInboundEmail } from "@/lib/inbox/ingest";
import { ingestInboundWhatsApp } from "@/lib/inbox/ingest-whatsapp";
import { inboundInjectSchema, whatsappInjectSchema } from "@/lib/inbox/schema";
import { ForbiddenError, requireAbility } from "@/lib/permissions";
import { upsertWhatsAppConnection } from "@/lib/integrations/whatsapp/connect";
import { consumeRateLimit } from "@/lib/rate-limit";

export type IntegrationsState = ActionResult<{ conversationId?: string }>;

function revalidateIntegrations() {
  revalidatePath("/settings/integrations");
  revalidatePath("/settings/integrations/gmail");
  revalidatePath("/settings/integrations/whatsapp");
  revalidatePath("/inbox");
  revalidatePath("/", "layout");
}

async function consumeInjectLimit(workspaceId: string) {
  const ip = await clientIp();
  const wsLimit = await consumeRateLimit(
    `inject:ws:${workspaceId}`,
    20,
    60 * 60 * 1000,
  );
  const ipLimit = await consumeRateLimit(`inject:ip:${ip}`, 30, 60 * 60 * 1000);
  return wsLimit.ok && ipLimit.ok;
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
      and(eq(integrations.userId, ctx.user.id), eq(integrations.kind, "gmail")),
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

  revalidateIntegrations();
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
  if (!(await consumeInjectLimit(ctx.workspace.id))) {
    return actionError("rate_limited");
  }

  const [gmail] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, ctx.user.id),
        eq(integrations.kind, "gmail"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!gmail) return actionError("not_connected");

  const from = `${parsed.data.fromName} <${parsed.data.fromEmail}>`;
  const result = await ingestInboundEmail({
    userId: ctx.user.id,
    homeWorkspaceId: ctx.workspace.id,
    integrationId: gmail.id,
    from,
    subject: parsed.data.subject,
    body: parsed.data.body,
    externalId: `dev:${crypto.randomUUID()}`,
    sentAt: new Date(),
  });

  revalidateIntegrations();
  return actionOk({ conversationId: result.conversationId });
}

export async function isWhatsAppConnected(): Promise<boolean> {
  const ctx = await getAppContext();
  const [row] = await db
    .select({ status: integrations.status })
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, ctx.user.id),
        eq(integrations.kind, "whatsapp"),
      ),
    )
    .limit(1);
  return row?.status === "connected";
}

export async function connectWhatsAppDev(): Promise<IntegrationsState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "integrations.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  await upsertWhatsAppConnection({
    userId: ctx.user.id,
    workspaceId: ctx.workspace.id,
    mode: "dev",
  });

  revalidateIntegrations();
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
        eq(integrations.userId, ctx.user.id),
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

  revalidateIntegrations();
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
  if (!(await consumeInjectLimit(ctx.workspace.id))) {
    return actionError("rate_limited");
  }

  const [whatsapp] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, ctx.user.id),
        eq(integrations.kind, "whatsapp"),
        eq(integrations.status, "connected"),
      ),
    )
    .limit(1);
  if (!whatsapp) return actionError("not_connected");

  const result = await ingestInboundWhatsApp({
    userId: ctx.user.id,
    homeWorkspaceId: ctx.workspace.id,
    integrationId: whatsapp.id,
    from: parsed.data.fromPhone,
    profileName: parsed.data.fromName,
    body: parsed.data.body,
    externalId: `dev:wa:${crypto.randomUUID()}`,
    sentAt: new Date(),
  });

  revalidateIntegrations();
  return actionOk({ conversationId: result.conversationId });
}
