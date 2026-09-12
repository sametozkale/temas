import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { DbOrTx } from "@/lib/db";
import {
  activityLog,
  applications,
  contacts,
  formSubmissions,
  forms,
  ownerViews,
  pipelineStages,
  properties,
} from "@/lib/db/schema";

export async function getFormByProperty(tx: DbOrTx, propertyId: string) {
  const [row] = await tx
    .select()
    .from(forms)
    .where(eq(forms.propertyId, propertyId))
    .limit(1);
  return row ?? null;
}

export async function getFormByPublicToken(tx: DbOrTx, token: string) {
  const [row] = await tx
    .select({
      form: forms,
      property: properties,
    })
    .from(forms)
    .innerJoin(properties, eq(properties.id, forms.propertyId))
    .where(eq(forms.publicToken, token))
    .limit(1);
  return row ?? null;
}

export async function listStages(tx: DbOrTx, propertyId: string) {
  return tx
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.propertyId, propertyId))
    .orderBy(asc(pipelineStages.position), asc(pipelineStages.createdAt));
}

export async function getOwnerViewByProperty(tx: DbOrTx, propertyId: string) {
  const [row] = await tx
    .select()
    .from(ownerViews)
    .where(eq(ownerViews.propertyId, propertyId))
    .limit(1);
  return row ?? null;
}

export async function getOwnerViewByToken(tx: DbOrTx, token: string) {
  const [row] = await tx
    .select({
      view: ownerViews,
      property: properties,
    })
    .from(ownerViews)
    .innerJoin(properties, eq(properties.id, ownerViews.propertyId))
    .where(eq(ownerViews.publicToken, token))
    .limit(1);
  return row ?? null;
}

export async function listApplications(tx: DbOrTx, propertyId: string) {
  return tx
    .select({
      application: applications,
      contact: contacts,
      submission: formSubmissions,
      stage: pipelineStages,
    })
    .from(applications)
    .innerJoin(contacts, eq(contacts.id, applications.contactId))
    .leftJoin(
      formSubmissions,
      eq(formSubmissions.id, applications.submissionId),
    )
    .leftJoin(pipelineStages, eq(pipelineStages.id, applications.stageId))
    .where(eq(applications.propertyId, propertyId))
    .orderBy(desc(applications.createdAt));
}

export async function listApplicationsInStages(
  tx: DbOrTx,
  propertyId: string,
  stageIds: string[],
) {
  if (stageIds.length === 0) return [];
  return tx
    .select({
      application: applications,
      contact: contacts,
      submission: formSubmissions,
      stage: pipelineStages,
    })
    .from(applications)
    .innerJoin(contacts, eq(contacts.id, applications.contactId))
    .leftJoin(
      formSubmissions,
      eq(formSubmissions.id, applications.submissionId),
    )
    .leftJoin(pipelineStages, eq(pipelineStages.id, applications.stageId))
    .where(
      and(
        eq(applications.propertyId, propertyId),
        inArray(applications.stageId, stageIds),
      ),
    )
    .orderBy(desc(applications.createdAt));
}

export async function getApplicationDetail(
  tx: DbOrTx,
  propertyId: string,
  applicationId: string,
) {
  const [row] = await tx
    .select({
      application: applications,
      contact: contacts,
      submission: formSubmissions,
      stage: pipelineStages,
    })
    .from(applications)
    .innerJoin(contacts, eq(contacts.id, applications.contactId))
    .leftJoin(
      formSubmissions,
      eq(formSubmissions.id, applications.submissionId),
    )
    .leftJoin(pipelineStages, eq(pipelineStages.id, applications.stageId))
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.propertyId, propertyId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listApplicationActivity(
  tx: DbOrTx,
  propertyId: string,
  applicationId: string,
) {
  return tx
    .select()
    .from(activityLog)
    .where(
      and(
        eq(activityLog.propertyId, propertyId),
        eq(activityLog.entity, "application"),
        eq(activityLog.entityId, applicationId),
      ),
    )
    .orderBy(desc(activityLog.createdAt));
}

export async function listPropertiesWithPipeline(
  tx: DbOrTx,
  workspaceId: string,
) {
  return tx
    .select({
      id: properties.id,
      title: properties.title,
      status: properties.status,
      applicantCount: sql<number>`count(${applications.id})::int`,
    })
    .from(properties)
    .leftJoin(applications, eq(applications.propertyId, properties.id))
    .where(
      and(
        eq(properties.workspaceId, workspaceId),
        isNull(properties.deletedAt),
      ),
    )
    .groupBy(properties.id)
    .orderBy(asc(properties.title));
}
