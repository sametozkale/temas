import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import type { AppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { requireAbility } from "@/lib/permissions";
import { getProperty } from "@/lib/properties/queries";
import { uuidSchema } from "@/lib/properties/schema";
import { revalidatePublicPropertyPages } from "@/lib/public-cache";

/** Soft delete (docs/03 header). Owner / agent only. */
export async function deletePropertyCore(
  ctx: AppContext,
  propertyId: string,
): Promise<ActionResult<{ title: string }>> {
  requireAbility(ctx.membership, "properties.delete");
  const parsed = uuidSchema.safeParse(propertyId);
  if (!parsed.success) return actionError("invalid");
  const id = parsed.data;

  const result = await withUserContext(ctx.user.id, async (tx) => {
    const current = await getProperty(tx, ctx.workspace.id, id);
    if (!current) return null;
    await tx
      .update(properties)
      .set({ deletedAt: new Date() })
      .where(eq(properties.id, id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "property.deleted",
        entity: "property",
        entityId: id,
        data: { title: current.title },
      },
      tx,
    );
    return current.title;
  });

  if (result === null) return actionError("not_found");
  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`, "layout");
  revalidatePath("/", "layout");
  await revalidatePublicPropertyPages(id);
  return actionOk({ title: result });
}
