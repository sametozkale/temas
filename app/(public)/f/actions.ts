"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

import { ApplicationReceivedEmail } from "@/emails/application-received";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { applications, contacts, formSubmissions } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/integrations/resend";
import { formCompletionCookie, parseFormAnswers } from "@/lib/pipeline/answers";
import { STAGE_NEW, STAGE_RENTED } from "@/lib/pipeline/defaults";
import { ensurePipeline } from "@/lib/pipeline/ensure";
import { getFormByPublicToken, listStages } from "@/lib/pipeline/queries";
import { identitySchema } from "@/lib/pipeline/schema";
import { consumeRateLimit } from "@/lib/rate-limit";
import { enqueueApplicantSummary } from "@/lib/ai/enqueue";
import { buildObjectPath, uploadPublicDocument } from "@/lib/storage";
import {
  getCalendarByProperty,
  listWorkspaceStaff,
} from "@/lib/viewings/queries";

async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local"
  );
}

export async function submitPublicForm(
  token: string,
  formData: FormData,
): Promise<ActionResult<{ bookingUrl: string | null }>> {
  const ip = await clientIp();
  const limit = await consumeRateLimit(`form:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return actionError("rate_limited");

  const found = await getFormByPublicToken(db, token);
  if (!found || !found.form.isPublished || found.property.deletedAt) {
    return actionError("not_found");
  }

  const parsedIdentity = identitySchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  if (!parsedIdentity.success) return actionError("invalid");

  const parsed = parseFormAnswers(found.form.schema, formData);
  if (parsed.missing.length > 0) return actionError("invalid");

  const attachments: { key: string; storagePath: string; name: string }[] = [];
  for (const item of parsed.files) {
    const path = buildObjectPath(
      found.property.workspaceId,
      found.property.id,
      item.file.name,
    );
    const stored = await uploadPublicDocument(path, item.file);
    attachments.push({
      key: item.key,
      storagePath: stored ?? "",
      name: item.file.name,
    });
  }

  const result = await db.transaction(async (tx) => {
    await ensurePipeline(tx, found.property.id);
    const stages = await listStages(tx, found.property.id);
    const newStage = stages.find((s) => s.name === STAGE_NEW) ?? stages[0];
    if (!newStage) return { error: "not_found" as const, created: false };

    const [existingContact] = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, found.property.workspaceId),
          eq(contacts.email, parsedIdentity.data.email),
        ),
      )
      .limit(1);

    let contactId = existingContact?.id;
    if (!contactId) {
      try {
        const [created] = await tx
          .insert(contacts)
          .values({
            workspaceId: found.property.workspaceId,
            fullName: parsedIdentity.data.fullName,
            email: parsedIdentity.data.email,
            phone: parsedIdentity.data.phone,
          })
          .returning({ id: contacts.id });
        contactId = created!.id;
      } catch {
        const [created] = await tx
          .insert(contacts)
          .values({
            workspaceId: found.property.workspaceId,
            fullName: parsedIdentity.data.fullName,
            email: parsedIdentity.data.email,
          })
          .returning({ id: contacts.id });
        contactId = created!.id;
      }
    } else {
      await tx
        .update(contacts)
        .set({
          fullName: parsedIdentity.data.fullName,
          ...(parsedIdentity.data.phone
            ? { phone: parsedIdentity.data.phone }
            : {}),
        })
        .where(eq(contacts.id, contactId));
    }

    const [submission] = await tx
      .insert(formSubmissions)
      .values({
        formId: found.form.id,
        contactId,
        answers: parsed.answers,
        attachments,
        status: "received",
      })
      .onConflictDoUpdate({
        target: [formSubmissions.formId, formSubmissions.contactId],
        set: {
          answers: parsed.answers,
          attachments,
          status: "received",
        },
      })
      .returning({ id: formSubmissions.id });

    const [current] = await tx
      .select({
        id: applications.id,
        stageId: applications.stageId,
      })
      .from(applications)
      .where(
        and(
          eq(applications.propertyId, found.property.id),
          eq(applications.contactId, contactId),
        ),
      )
      .limit(1);

    const currentStage = current
      ? stages.find((s) => s.id === current.stageId)
      : null;
    const rented = currentStage?.name === STAGE_RENTED;

    let applicationId = current?.id;
    if (current) {
      await tx
        .update(applications)
        .set(
          rented
            ? { submissionId: submission!.id }
            : { submissionId: submission!.id, stageId: newStage.id },
        )
        .where(eq(applications.id, current.id));
    } else {
      const [created] = await tx
        .insert(applications)
        .values({
          propertyId: found.property.id,
          contactId,
          submissionId: submission!.id,
          stageId: newStage.id,
        })
        .returning({ id: applications.id });
      applicationId = created!.id;
    }

    await logActivity(
      {
        workspaceId: found.property.workspaceId,
        propertyId: found.property.id,
        action: current ? "application.updated" : "application.created",
        entity: "application",
        entityId: applicationId,
        data: { email: parsedIdentity.data.email },
      },
      tx,
    );

    return { error: null, created: !current, applicationId: applicationId! };
  });

  if (result.error) return actionError(result.error);

  try {
    await enqueueApplicantSummary(result.applicationId);
  } catch {
    // summaries are best-effort
  }

  const cookieStore = await cookies();
  cookieStore.set(formCompletionCookie(found.form.id), "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  if (result.created) {
    const staff = await listWorkspaceStaff(db, found.property.workspaceId);
    for (const member of staff) {
      if (!member.email) continue;
      await sendEmail({
        to: member.email,
        subject: `New application — ${found.property.title}`,
        react: ApplicationReceivedEmail({
          recipientName: member.name || member.email,
          propertyTitle: found.property.title,
          applicantName: parsedIdentity.data.fullName,
        }),
      });
    }
  }

  revalidatePath(`/f/${token}`);
  revalidatePath(`/properties/${found.property.id}/applications`);
  revalidatePath("/pipeline");

  const calendar = await getCalendarByProperty(db, found.property.id);
  const bookingUrl =
    calendar?.isPublished && calendar.publicToken
      ? new URL(`/b/${calendar.publicToken}`, env().APP_URL).toString()
      : null;

  return actionOk({ bookingUrl });
}
