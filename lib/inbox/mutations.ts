import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import type { AppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { conversations, properties } from "@/lib/db/schema";
import { ForbiddenError, requireAbility } from "@/lib/permissions";

export const linkConversationSchema = z.object({
  conversationId: z.string().uuid(),
  /** null unlinks the thread. */
  propertyId: z.string().uuid().nullable(),
});

/** Manually links (or unlinks) one of the caller's threads to a listing. */
export async function linkConversationToPropertyCore(
  ctx: AppContext,
  input: unknown,
): Promise<ActionResult<{ propertyTitle: string | null }>> {
  try {
    requireAbility(ctx.membership, "inbox.write");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }
  const parsed = linkConversationSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");
  const { conversationId, propertyId } = parsed.data;

  const result = await withUserContext(ctx.user.id, async (tx) => {
    let propertyTitle: string | null = null;
    if (propertyId) {
      const [property] = await tx
        .select({ title: properties.title })
        .from(properties)
        .where(
          and(
            eq(properties.id, propertyId),
            eq(properties.workspaceId, ctx.workspace.id),
            isNull(properties.deletedAt),
          ),
        )
        .limit(1);
      if (!property) return null;
      propertyTitle = property.title;
    }
    const [row] = await tx
      .update(conversations)
      .set({ propertyId })
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.workspaceId, ctx.workspace.id),
          eq(conversations.userId, ctx.user.id),
        ),
      )
      .returning({ id: conversations.id });
    if (!row) return null;
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId,
        action: propertyId ? "conversation.linked" : "conversation.unlinked",
        entity: "conversation",
        entityId: conversationId,
      },
      tx,
    );
    return { propertyTitle };
  });

  if (!result) return actionError("not_found");
  revalidatePath("/inbox");
  revalidatePath(`/inbox/${conversationId}`);
  if (propertyId) revalidatePath(`/properties/${propertyId}`, "layout");
  return actionOk(result);
}
