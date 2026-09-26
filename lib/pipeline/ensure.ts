import { eq } from "drizzle-orm";

import type { DbOrTx } from "@/lib/db";
import { forms, ownerViews, pipelineStages } from "@/lib/db/schema";
import { secureToken } from "@/lib/slug";

import {
  DEFAULT_FORM_FIELDS,
  DEFAULT_STAGES,
  STAGE_APPROVED,
  STAGE_SHORTLISTED,
} from "./defaults";
import {
  getFormByProperty,
  getOwnerViewByProperty,
  listStages,
} from "./queries";

export async function ensureForm(tx: DbOrTx, propertyId: string) {
  const existing = await getFormByProperty(tx, propertyId);
  if (existing) return existing;
  const [row] = await tx
    .insert(forms)
    .values({
      propertyId,
      title: "Prospective tenant application",
      schema: DEFAULT_FORM_FIELDS,
      publicToken: secureToken(),
      isPublished: false,
    })
    .returning();
  return row!;
}

export async function ensureStages(tx: DbOrTx, propertyId: string) {
  const existing = await listStages(tx, propertyId);
  if (existing.length > 0) return existing;
  const rows = await tx
    .insert(pipelineStages)
    .values(
      DEFAULT_STAGES.map((stage, position) => ({
        propertyId,
        name: stage.name,
        color: stage.color,
        isTerminal: stage.isTerminal,
        position,
      })),
    )
    .returning();
  return rows.sort((a, b) => a.position - b.position);
}

export async function ensureOwnerView(tx: DbOrTx, propertyId: string) {
  const stages = await ensureStages(tx, propertyId);
  const existing = await getOwnerViewByProperty(tx, propertyId);
  const show = stages
    .filter((s) => s.name === STAGE_SHORTLISTED || s.name === STAGE_APPROVED)
    .map((s) => s.id);
  if (existing) {
    if (!existing.showStages?.length && show.length) {
      const [updated] = await tx
        .update(ownerViews)
        .set({ showStages: show })
        .where(eq(ownerViews.id, existing.id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }
  const [row] = await tx
    .insert(ownerViews)
    .values({
      propertyId,
      publicToken: secureToken(),
      showStages: show,
    })
    .returning();
  return row!;
}

export async function ensurePipeline(tx: DbOrTx, propertyId: string) {
  const form = await ensureForm(tx, propertyId);
  const stages = await ensureStages(tx, propertyId);
  const ownerView = await ensureOwnerView(tx, propertyId);
  return { form, stages, ownerView };
}
