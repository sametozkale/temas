"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import {
  applications,
  forms,
  ownerViews,
  pipelineStages,
} from "@/lib/db/schema";
import { requireAbility } from "@/lib/permissions";
import { uuidSchema } from "@/lib/properties/schema";
import { createSignedDownload } from "@/lib/storage";
import { STORAGE_BUCKETS } from "@/lib/storage-constants";
import { secureToken } from "@/lib/slug";
import { ensurePipeline } from "@/lib/pipeline/ensure";
import {
  getApplicationDetail,
  getFormByProperty,
  listApplicationActivity,
  listStages,
} from "@/lib/pipeline/queries";
import { formSchemaInput, stageInputSchema } from "@/lib/pipeline/schema";
import { STAGE_RENTED } from "@/lib/pipeline/defaults";

export type PipelineActionResult<T = undefined> = ActionResult<T>;

function revalidatePipeline(propertyId: string) {
  revalidatePath(`/properties/${propertyId}/applications`);
  revalidatePath("/pipeline");
}

export async function saveForm(
  propertyId: string,
  input: unknown,
): Promise<PipelineActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "pipeline.manage");
  const id = uuidSchema.parse(propertyId);
  const parsed = formSchemaInput.safeParse(input);
  if (!parsed.success) {
    return actionError("invalid", z.flattenError(parsed.error).fieldErrors);
  }

  await withUserContext(ctx.user.id, async (tx) => {
    await ensurePipeline(tx, id);
    const current = await getFormByProperty(tx, id);
    if (!current) return;
    const publishing = parsed.data.isPublished === true && !current.isPublished;
    await tx
      .update(forms)
      .set({
        title: parsed.data.title,
        schema: parsed.data.schema,
        isPublished: parsed.data.isPublished ?? current.isPublished,
      })
      .where(eq(forms.id, current.id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: publishing ? "form.published" : "form.updated",
        entity: "form",
        entityId: current.id,
      },
      tx,
    );
  });

  revalidatePipeline(id);
  return actionOk();
}

export async function addStage(
  propertyId: string,
  input: unknown,
): Promise<PipelineActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "pipeline.manage");
  const id = uuidSchema.parse(propertyId);
  const parsed = stageInputSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");

  await withUserContext(ctx.user.id, async (tx) => {
    await ensurePipeline(tx, id);
    const [agg] = await tx
      .select({ pos: max(pipelineStages.position) })
      .from(pipelineStages)
      .where(eq(pipelineStages.propertyId, id));
    await tx.insert(pipelineStages).values({
      propertyId: id,
      name: parsed.data.name,
      color: parsed.data.color ?? "muted",
      isTerminal: parsed.data.isTerminal ?? false,
      position: (agg?.pos ?? -1) + 1,
    });
  });

  revalidatePipeline(id);
  return actionOk();
}

export async function renameStage(
  propertyId: string,
  stageId: string,
  input: unknown,
): Promise<PipelineActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "pipeline.manage");
  const id = uuidSchema.parse(propertyId);
  const sid = uuidSchema.parse(stageId);
  const parsed = stageInputSchema.pick({ name: true }).safeParse(input);
  if (!parsed.success) return actionError("invalid");

  const ok = await withUserContext(ctx.user.id, async (tx) => {
    const [row] = await tx
      .update(pipelineStages)
      .set({ name: parsed.data.name })
      .where(and(eq(pipelineStages.id, sid), eq(pipelineStages.propertyId, id)))
      .returning({ id: pipelineStages.id });
    return Boolean(row);
  });

  if (!ok) return actionError("not_found");
  revalidatePipeline(id);
  return actionOk();
}

export async function moveApplication(
  propertyId: string,
  applicationId: string,
  stageId: string,
): Promise<PipelineActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "pipeline.manage");
  const pid = uuidSchema.parse(propertyId);
  const aid = uuidSchema.parse(applicationId);
  const sid = uuidSchema.parse(stageId);

  const ok = await withUserContext(ctx.user.id, async (tx) => {
    const current = await getApplicationDetail(tx, pid, aid);
    if (!current) return false;
    const stages = await listStages(tx, pid);
    const target = stages.find((s) => s.id === sid);
    if (!target) return false;
    await tx
      .update(applications)
      .set({
        stageId: sid,
        decidedAt:
          target.isTerminal || target.name === STAGE_RENTED
            ? new Date()
            : current.application.decidedAt,
      })
      .where(eq(applications.id, aid));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: pid,
        action: "application.stage_changed",
        entity: "application",
        entityId: aid,
        data: {
          from: current.stage?.name ?? null,
          to: target.name,
        },
      },
      tx,
    );
    return true;
  });

  if (!ok) return actionError("not_found");
  revalidatePipeline(pid);
  return actionOk();
}

export async function rotateOwnerLink(
  propertyId: string,
): Promise<PipelineActionResult> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "pipeline.manage");
  const id = uuidSchema.parse(propertyId);

  await withUserContext(ctx.user.id, async (tx) => {
    const { ownerView } = await ensurePipeline(tx, id);
    await tx
      .update(ownerViews)
      .set({ publicToken: secureToken() })
      .where(eq(ownerViews.id, ownerView.id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: id,
        action: "owner_view.created",
        entity: "owner_view",
        entityId: ownerView.id,
      },
      tx,
    );
  });

  revalidatePipeline(id);
  return actionOk();
}

export async function loadApplicant(
  propertyId: string,
  applicationId: string,
): Promise<
  PipelineActionResult<{
    fullName: string;
    email: string | null;
    phone: string | null;
    stageName: string | null;
    score: number | null;
    aiSummary: string | null;
    answers: Record<string, unknown>;
    attachments: { key: string; name: string; url: string | null }[];
    history: {
      id: string;
      action: string;
      createdAt: string;
      data: Record<string, unknown>;
    }[];
  }>
> {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "pipeline.manage");
  const pid = uuidSchema.parse(propertyId);
  const aid = uuidSchema.parse(applicationId);

  const payload = await withUserContext(ctx.user.id, async (tx) => {
    const row = await getApplicationDetail(tx, pid, aid);
    if (!row) return null;
    const history = await listApplicationActivity(tx, pid, aid);
    const attachments = row.submission?.attachments ?? [];
    const urls = await Promise.all(
      attachments.map(async (file) => {
        if (!file.storagePath) return { ...file, url: null as string | null };
        try {
          const url = await createSignedDownload(
            STORAGE_BUCKETS.documents,
            file.storagePath,
            { download: file.name },
          );
          return { key: file.key, name: file.name, url };
        } catch {
          return { key: file.key, name: file.name, url: null };
        }
      }),
    );
    return {
      fullName: row.contact.fullName,
      email: row.contact.email,
      phone: row.contact.phone,
      stageName: row.stage?.name ?? null,
      score: row.application.score,
      aiSummary: row.application.aiSummary,
      answers: row.submission?.answers ?? {},
      attachments: urls,
      history: history.map((h) => ({
        id: h.id,
        action: h.action,
        createdAt: h.createdAt.toISOString(),
        data: h.data ?? {},
      })),
    };
  });

  if (!payload) return actionError("not_found");
  return actionOk(payload);
}
