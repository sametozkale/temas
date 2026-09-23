"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { getAppContext } from "@/lib/auth";
import { variablesFromBody } from "@/lib/contracts/placeholders";
import {
  getContractTemplate,
  listContractTemplates,
} from "@/lib/contracts/queries";
import { starterTemplateByName } from "@/lib/contracts/seed";
import { withUserContext } from "@/lib/db";
import { contractTemplates } from "@/lib/db/schema";
import { ForbiddenError, requireAbility } from "@/lib/permissions";

export type TemplateState = ActionResult<{ id?: string }>;

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  bodyMd: z.string().trim().min(10).max(40_000),
});

async function requireTemplates() {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "templates.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false as const, error: "forbidden" as const };
    }
    throw error;
  }
  return { ok: true as const, ctx };
}

export async function saveContractTemplate(
  _prev: TemplateState | undefined,
  formData: FormData,
): Promise<TemplateState> {
  const gate = await requireTemplates();
  if (!gate.ok) return actionError(gate.error);
  const { ctx } = gate;

  const parsed = templateSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    bodyMd: formData.get("bodyMd"),
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  const variables = variablesFromBody(parsed.data.bodyMd);

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
        .set({
          name: parsed.data.name,
          bodyMd: parsed.data.bodyMd,
          variables,
        })
        .where(eq(contractTemplates.id, existing.id));
      return existing.id;
    }
    const [row] = await tx
      .insert(contractTemplates)
      .values({
        workspaceId: ctx.workspace.id,
        name: parsed.data.name,
        bodyMd: parsed.data.bodyMd,
        variables,
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
  revalidatePath(`/settings/templates/${id}`);
  return actionOk({ id });
}

const restoreSchema = z.object({
  id: z.string().uuid(),
});

export async function restoreContractTemplate(
  templateId: string,
): Promise<TemplateState> {
  const gate = await requireTemplates();
  if (!gate.ok) return actionError(gate.error);
  const { ctx } = gate;

  const parsed = restoreSchema.safeParse({ id: templateId });
  if (!parsed.success) return actionError("invalid");

  const result = await withUserContext(ctx.user.id, async (tx) => {
    const existing = await getContractTemplate(
      tx,
      ctx.workspace.id,
      parsed.data.id,
    );
    if (!existing) return { ok: false as const, error: "not_found" as const };
    const starter = starterTemplateByName(existing.name);
    if (!starter) return { ok: false as const, error: "not_starter" as const };
    await tx
      .update(contractTemplates)
      .set({
        bodyMd: starter.bodyMd,
        variables: starter.variables,
      })
      .where(eq(contractTemplates.id, existing.id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: "contract_template.restored",
        entity: "contract_template",
        entityId: existing.id,
        data: { name: existing.name },
      },
      tx,
    );
    return { ok: true as const, id: existing.id };
  });

  if (!result.ok) return actionError(result.error);
  revalidatePath("/settings/templates");
  revalidatePath(`/settings/templates/${result.id}`);
  return actionOk({ id: result.id });
}
