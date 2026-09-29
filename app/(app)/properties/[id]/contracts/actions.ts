"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { getAppContext } from "@/lib/auth";
import { exportContractDocuments } from "@/lib/contracts/export";
import { getContract } from "@/lib/contracts/queries";
import { createContractCore } from "@/lib/contracts/mutations";
import { withUserContext } from "@/lib/db";
import { contracts, documents } from "@/lib/db/schema";
import { ForbiddenError, requireAbility } from "@/lib/permissions";
import { STORAGE_BUCKETS, buildObjectPath, uploadBuffer } from "@/lib/storage";

export type ContractState = ActionResult<{ id?: string }>;

export async function createContract(
  _prev: ContractState | undefined,
  formData: FormData,
): Promise<ContractState> {
  const ctx = await getAppContext();
  const result = await createContractCore(ctx, {
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
  if (!result.ok) return result;
  const { id, propertyId } = result.data!;
  revalidatePath(`/properties/${propertyId}`);
  redirect(`/properties/${propertyId}/contracts/${id}`);
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
