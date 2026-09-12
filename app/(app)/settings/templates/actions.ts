"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { getAppContext } from "@/lib/auth";
import {
  getContractTemplate,
  listContractTemplates,
} from "@/lib/contracts/queries";
import { withUserContext } from "@/lib/db";
import { contractTemplates } from "@/lib/db/schema";
import { ForbiddenError, requireAbility } from "@/lib/permissions";

export type TemplateState = ActionResult<{ id?: string }>;

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  bodyMd: z.string().trim().min(10).max(40_000),
});

export async function saveContractTemplate(
  _prev: TemplateState | undefined,
  formData: FormData,
): Promise<TemplateState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "templates.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const parsed = templateSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    bodyMd: formData.get("bodyMd"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  const id = await withUserContext(ctx.user.id, async (tx) => {
    await listContractTemplates(tx, ctx.workspace.id);
    if (parsed.data.id) {
      const existing = await getContractTemplate(
        tx,
        ctx.workspace.id,
        parsed.data.id,
      );
      if (!existing) return null;
      await tx
        .update(contractTemplates)
        .set({ name: parsed.data.name, bodyMd: parsed.data.bodyMd })
        .where(eq(contractTemplates.id, existing.id));
      return existing.id;
    }
    const [row] = await tx
      .insert(contractTemplates)
      .values({
        workspaceId: ctx.workspace.id,
        name: parsed.data.name,
        bodyMd: parsed.data.bodyMd,
        variables: [],
      })
      .returning({ id: contractTemplates.id });
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: "contract_template.saved",
        entity: "contract_template",
        entityId: row!.id,
        data: { name: parsed.data.name },
      },
      tx,
    );
    return row!.id;
  });

  if (!id) return actionError("not_found");
  revalidatePath("/settings/templates");
  return actionOk({ id });
}
