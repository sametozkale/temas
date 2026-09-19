import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { logActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { integrations, workspaceMembers } from "@/lib/db/schema";
import { consumeRateLimit } from "@/lib/rate-limit";

import { verifyWhatsAppPairToken } from "./pair";

export async function upsertWhatsAppConnection(input: {
  userId: string;
  workspaceId: string;
  externalId?: string;
  mode?: "pair" | "dev";
}) {
  const mode = input.mode ?? "pair";
  const externalId = input.externalId ?? mode;
  const [upserted] = await db
    .insert(integrations)
    .values({
      userId: input.userId,
      workspaceId: input.workspaceId,
      kind: "whatsapp",
      status: "connected",
      credentials: { mode },
      externalId,
    })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.kind],
      set: {
        workspaceId: input.workspaceId,
        status: "connected",
        credentials: { mode },
        externalId,
      },
    })
    .returning({ id: integrations.id });

  if (upserted) {
    await logActivity({
      workspaceId: input.workspaceId,
      actorId: input.userId,
      action: "integration.connected",
      entity: "integration",
      entityId: upserted.id,
      data: { kind: "whatsapp", mode },
    });
  }

  return upserted;
}

export async function completeWhatsAppPairing(token: string) {
  const limited = await consumeRateLimit(
    `wa-pair:${token.slice(0, 24)}`,
    20,
    60 * 60 * 1000,
  );
  if (!limited.ok) return "rate_limited" as const;

  const payload = verifyWhatsAppPairToken(token);
  if (!payload) return "invalid" as const;

  const [member] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, payload.u),
        eq(workspaceMembers.workspaceId, payload.w),
      ),
    )
    .limit(1);
  if (!member) return "invalid" as const;

  await upsertWhatsAppConnection({
    userId: payload.u,
    workspaceId: payload.w,
  });
  revalidatePath("/settings/integrations");
  revalidatePath("/settings/integrations/whatsapp");
  revalidatePath("/inbox");
  return "ok" as const;
}
