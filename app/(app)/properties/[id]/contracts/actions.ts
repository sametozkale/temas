"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { generateContractDraft } from "@/lib/ai/contract";
import { getAppContext } from "@/lib/auth";
import { exportContractDocuments } from "@/lib/contracts/export";
import {
  getContract,
  getContractParties,
  getContractTemplate,
} from "@/lib/contracts/queries";
import { mergeValues } from "@/lib/contracts/variables";
import { withUserContext } from "@/lib/db";
import {
  applications,
  contacts,
  contracts,
  documents,
  properties,
} from "@/lib/db/schema";
import { formatAddress } from "@/lib/format";
import { ForbiddenError, requireAbility } from "@/lib/permissions";
import { STORAGE_BUCKETS, buildObjectPath, uploadBuffer } from "@/lib/storage";

export type ContractState = ActionResult<{ id?: string }>;

const createSchema = z.object({
  propertyId: z.string().uuid(),
  templateId: z.string().uuid(),
  applicationId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .or(z.literal("none")),
  rent: z.string().trim().max(40).optional().or(z.literal("")),
  deposit: z.string().trim().max(40).optional().or(z.literal("")),
  startDate: z.string().trim().max(40).optional().or(z.literal("")),
  endDate: z.string().trim().max(40).optional().or(z.literal("")),
  increaseRate: z.string().trim().max(40).optional().or(z.literal("")),
  specialClauses: z.string().trim().max(4000).optional().or(z.literal("")),
});

export async function createContract(
  _prev: ContractState | undefined,
  formData: FormData,
): Promise<ContractState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "contracts.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const parsed = createSchema.safeParse({
    propertyId: formData.get("propertyId"),
    templateId: formData.get("templateId"),
    applicationId: formData.get("applicationId") ?? "",
    rent: formData.get("rent") ?? "",
    deposit: formData.get("deposit") ?? "",
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
    increaseRate: formData.get("increaseRate") ?? "",
    specialClauses: formData.get("specialClauses") ?? "",
  });
  if (!parsed.success) {
    return actionError("invalid", parsed.error.flatten().fieldErrors);
  }

  const applicationId =
    parsed.data.applicationId && parsed.data.applicationId !== "none"
      ? parsed.data.applicationId
      : null;
  const result: { error: string } | { id: string; propertyId: string } =
    await withUserContext(ctx.user.id, async (tx) => {
      const [property] = await tx
        .select()
        .from(properties)
        .where(
          and(
            eq(properties.id, parsed.data.propertyId),
            eq(properties.workspaceId, ctx.workspace.id),
          ),
        )
        .limit(1);
      if (!property) return { error: "not_found" as const };

      const template = await getContractTemplate(
        tx,
        ctx.workspace.id,
        parsed.data.templateId,
      );
      if (!template) return { error: "not_found" as const };

      let tenantName: string | null = null;
      if (applicationId) {
        const [app] = await tx
          .select({ name: contacts.fullName })
          .from(applications)
          .innerJoin(contacts, eq(contacts.id, applications.contactId))
          .where(
            and(
              eq(applications.id, applicationId),
              eq(applications.propertyId, property.id),
            ),
          )
          .limit(1);
        tenantName = app?.name ?? null;
      }

      const parties = await getContractParties(tx, property.id);
      const values = mergeValues(
        {
          landlord_name: parties.landlord,
          tenant_name: tenantName ?? parties.tenant,
          property_title: property.title,
          property_address: formatAddress(property.address) ?? "",
          rent: property.rentAmount,
          deposit: property.depositAmount,
          currency: property.currency,
        },
        {
          rent: parsed.data.rent,
          deposit: parsed.data.deposit,
          start_date: parsed.data.startDate,
          end_date: parsed.data.endDate,
          increase_rate: parsed.data.increaseRate,
          special_clauses: parsed.data.specialClauses,
        },
      );

      const generated = await generateContractDraft({
        templateMd: template.bodyMd,
        values,
        propertyTitle: property.title,
        parties: {
          landlord: values.landlord_name,
          tenant: values.tenant_name,
        },
      });

      const [row] = await tx
        .insert(contracts)
        .values({
          propertyId: property.id,
          templateId: template.id,
          applicationId,
          status: "draft",
          values,
          bodyMd: generated.bodyMd,
          versions: [
            { savedAt: new Date().toISOString(), bodyMd: generated.bodyMd },
          ],
        })
        .returning({ id: contracts.id });

      await logActivity(
        {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          propertyId: property.id,
          action: "contract.created",
          entity: "contract",
          entityId: row!.id,
          data: { template: template.name, missing: generated.missing },
        },
        tx,
      );
      return { id: row!.id, propertyId: property.id };
    });

  if ("error" in result) return actionError(result.error);
  revalidatePath(`/properties/${result.propertyId}`);
  redirect(`/properties/${result.propertyId}/contracts/${result.id}`);
}

const saveSchema = z.object({
  contractId: z.string().uuid(),
  bodyMd: z.string().min(1).max(80_000),
});

export async function saveContractBody(
  _prev: ContractState | undefined,
  formData: FormData,
): Promise<ContractState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "contracts.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }
  const parsed = saveSchema.safeParse({
    contractId: formData.get("contractId"),
    bodyMd: formData.get("bodyMd"),
  });
  if (!parsed.success) return actionError("invalid");

  const saved = await withUserContext(ctx.user.id, async (tx) => {
    const found = await getContract(
      tx,
      ctx.workspace.id,
      parsed.data.contractId,
    );
    if (!found) return null;
    const versions = [
      ...found.contract.versions,
      { savedAt: new Date().toISOString(), bodyMd: parsed.data.bodyMd },
    ].slice(-20);
    await tx
      .update(contracts)
      .set({ bodyMd: parsed.data.bodyMd, versions, status: "ready" })
      .where(eq(contracts.id, found.contract.id));
    return found.contract.propertyId;
  });
  if (!saved) return actionError("not_found");
  revalidatePath(`/properties/${saved}/contracts/${parsed.data.contractId}`);
  return actionOk({ id: parsed.data.contractId });
}

const ackSchema = z.object({
  contractId: z.string().uuid(),
  acknowledged: z.enum(["true", "false"]),
});

export async function setContractDisclaimer(
  contractId: string,
  acknowledged: boolean,
): Promise<ContractState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "contracts.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }
  const parsed = ackSchema.safeParse({
    contractId,
    acknowledged: acknowledged ? "true" : "false",
  });
  if (!parsed.success) return actionError("invalid");

  const saved = await withUserContext(ctx.user.id, async (tx) => {
    const found = await getContract(
      tx,
      ctx.workspace.id,
      parsed.data.contractId,
    );
    if (!found) return null;
    await tx
      .update(contracts)
      .set({ disclaimerAcknowledged: parsed.data.acknowledged === "true" })
      .where(eq(contracts.id, found.contract.id));
    return found.contract.propertyId;
  });
  if (!saved) return actionError("not_found");
  revalidatePath(`/properties/${saved}/contracts/${contractId}`);
  return actionOk({ id: contractId });
}

const exportSchema = z.object({
  contractId: z.string().uuid(),
  format: z.enum(["docx", "pdf"]),
});

export async function exportContract(
  contractId: string,
  format: "docx" | "pdf",
): Promise<ContractState> {
  const ctx = await getAppContext();
  try {
    requireAbility(ctx.membership, "contracts.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }
  const parsed = exportSchema.safeParse({ contractId, format });
  if (!parsed.success) return actionError("invalid");

  const found = await withUserContext(ctx.user.id, (tx) =>
    getContract(tx, ctx.workspace.id, parsed.data.contractId),
  );
  if (!found) return actionError("not_found");
  if (!found.contract.disclaimerAcknowledged) {
    return actionError("disclaimer");
  }

  const files = await exportContractDocuments(
    found.propertyTitle,
    found.contract.bodyMd,
  );
  const ext = parsed.data.format;
  const buffer = ext === "docx" ? files.docx : files.pdf;
  const contentType =
    ext === "docx"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf";
  const fileName = `${found.propertyTitle}.${ext}`;
  const path = buildObjectPath(
    ctx.workspace.id,
    found.contract.propertyId,
    fileName,
  );
  await uploadBuffer(STORAGE_BUCKETS.documents, path, buffer, contentType);

  await withUserContext(ctx.user.id, async (tx) => {
    const [doc] = await tx
      .insert(documents)
      .values({
        propertyId: found.contract.propertyId,
        kind: "contract",
        title: fileName,
        storagePath: path,
        createdBy: ctx.user.id,
        meta: { size: buffer.byteLength, contentType, originalName: fileName },
      })
      .returning({ id: documents.id });
    await tx
      .update(contracts)
      .set({
        status: "exported",
        ...(ext === "docx" ? { outputDocPath: path } : { outputPdfPath: path }),
      })
      .where(eq(contracts.id, found.contract.id));
    await logActivity(
      {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        propertyId: found.contract.propertyId,
        action: "contract.exported",
        entity: "contract",
        entityId: found.contract.id,
        data: { format: ext, documentId: doc!.id },
      },
      tx,
    );
  });

  revalidatePath(`/properties/${found.contract.propertyId}/files`);
  revalidatePath(
    `/properties/${found.contract.propertyId}/contracts/${found.contract.id}`,
  );
  return actionOk({ id: found.contract.id });
}
