"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { OwnerDecisionEmail } from "@/emails/owner-decision";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema";
import { sendEmail } from "@/lib/integrations/resend";
import { STAGE_APPROVED, STAGE_REVIEWING } from "@/lib/pipeline/defaults";
import {
  getApplicationDetail,
  getOwnerViewByToken,
  listStages,
} from "@/lib/pipeline/queries";
import { ownerDecisionSchema } from "@/lib/pipeline/schema";
import { consumeRateLimit } from "@/lib/rate-limit";
import { listWorkspaceStaff } from "@/lib/viewings/queries";

async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local"
  );
}

export async function submitOwnerDecision(
  token: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = ownerDecisionSchema.safeParse(input);
  if (!parsed.success) return actionError("invalid");

  const ip = await clientIp();
  const limit = await consumeRateLimit(`owner:${ip}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return actionError("rate_limited");

  const found = await getOwnerViewByToken(db, token);
  if (!found || found.property.deletedAt) return actionError("not_found");
  if (found.view.expiresAt && found.view.expiresAt.getTime() < Date.now()) {
    return actionError("not_found");
  }

  const allowed = new Set(found.view.showStages ?? []);
  const stages = await listStages(db, found.property.id);
  const targetName =
    parsed.data.decision === "approve" ? STAGE_APPROVED : STAGE_REVIEWING;
  const target = stages.find((s) => s.name === targetName);
  if (!target) return actionError("not_found");

  const current = await getApplicationDetail(
    db,
    found.property.id,
    parsed.data.applicationId,
  );
  if (!current) return actionError("not_found");
  if (
    current.application.stageId &&
    !allowed.has(current.application.stageId)
  ) {
    return actionError("not_found");
  }

  const action =
    parsed.data.decision === "approve"
      ? "application.owner_approved"
      : "application.owner_changes_requested";

  await db
    .update(applications)
    .set({
      stageId: target.id,
      decidedAt: parsed.data.decision === "approve" ? new Date() : null,
    })
    .where(eq(applications.id, current.application.id));

  await logActivity({
    workspaceId: found.property.workspaceId,
    propertyId: found.property.id,
    action,
    entity: "application",
    entityId: current.application.id,
    data: { to: target.name },
  });

  const staff = await listWorkspaceStaff(db, found.property.workspaceId);
  for (const member of staff) {
    if (!member.email) continue;
    await sendEmail({
      to: member.email,
      subject:
        parsed.data.decision === "approve"
          ? `Owner approved ${current.contact.fullName}`
          : `Owner requested changes — ${current.contact.fullName}`,
      react: OwnerDecisionEmail({
        recipientName: member.name || member.email,
        propertyTitle: found.property.title,
        applicantName: current.contact.fullName,
        decision: parsed.data.decision,
      }),
    });
  }

  revalidatePath(`/o/${token}`);
  revalidatePath(`/properties/${found.property.id}/applications`);
  revalidatePath("/pipeline");
  return actionOk();
}
