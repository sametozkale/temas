import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  applications,
  contacts,
  formSubmissions,
  forms,
  properties,
} from "@/lib/db/schema";
import { upsertEmbedding } from "@/lib/ai/embed";
import { isTextConfigured, textModel } from "@/lib/ai/models";
import { loadPrompt } from "@/lib/ai/prompts";
import { mockApplicantSummary } from "@/lib/ai/summary-mock";

const schema = z.object({
  summary: z.string().min(1).max(1200),
  score: z.number().int().min(1).max(5),
  riskNote: z.string().max(400).optional(),
});

export async function summariseApplication(applicationId: string) {
  const [row] = await db
    .select({
      application: applications,
      contact: contacts,
      property: properties,
      answers: formSubmissions.answers,
      formTitle: forms.title,
    })
    .from(applications)
    .innerJoin(contacts, eq(contacts.id, applications.contactId))
    .innerJoin(properties, eq(properties.id, applications.propertyId))
    .leftJoin(
      formSubmissions,
      eq(formSubmissions.id, applications.submissionId),
    )
    .leftJoin(forms, eq(forms.id, formSubmissions.formId))
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row) return { skipped: true as const };

  const payload = {
    applicant: row.contact.fullName,
    email: row.contact.email,
    property: row.property.title,
    form: row.formTitle,
    answers: row.answers ?? {},
  };

  const generated = isTextConfigured()
    ? await generateWithModel(payload)
    : mockApplicantSummary(payload);

  const summary = generated.riskNote
    ? `${generated.summary} Risk: ${generated.riskNote}`
    : generated.summary;

  await db
    .update(applications)
    .set({ aiSummary: summary, score: generated.score })
    .where(eq(applications.id, applicationId));

  await upsertEmbedding({
    workspaceId: row.property.workspaceId,
    entity: "application",
    entityId: applicationId,
    chunk: `${row.contact.fullName}. ${summary}`,
    meta: { propertyId: row.property.id, score: generated.score },
  });

  return { skipped: false as const, score: generated.score };
}

async function generateWithModel(payload: {
  applicant: string;
  email: string | null;
  property: string;
  form: string | null;
  answers: Record<string, unknown>;
}) {
  const model = textModel("haiku");
  if (!model) return mockApplicantSummary(payload);
  const { object } = await generateObject({
    model,
    schema,
    system: loadPrompt("applicant-summary.md"),
    prompt: JSON.stringify(payload),
  });
  return object;
}
