import { and, desc, eq } from "drizzle-orm";

import type { DbOrTx } from "@/lib/db";
import {
  applications,
  contacts,
  contractTemplates,
  contracts,
  properties,
  propertyPeople,
} from "@/lib/db/schema";
import { SEED_CONTRACT_TEMPLATES } from "@/lib/contracts/seed";

export async function ensureContractTemplates(tx: DbOrTx, workspaceId: string) {
  const existing = await tx
    .select({ id: contractTemplates.id })
    .from(contractTemplates)
    .where(eq(contractTemplates.workspaceId, workspaceId))
    .limit(1);
  if (existing.length > 0) return;
  await tx.insert(contractTemplates).values(
    SEED_CONTRACT_TEMPLATES.map((template) => ({
      workspaceId,
      name: template.name,
      bodyMd: template.bodyMd,
      variables: template.variables,
    })),
  );
}

export async function listContractTemplates(tx: DbOrTx, workspaceId: string) {
  await ensureContractTemplates(tx, workspaceId);
  return tx
    .select()
    .from(contractTemplates)
    .where(eq(contractTemplates.workspaceId, workspaceId))
    .orderBy(contractTemplates.name);
}

export async function getContractTemplate(
  tx: DbOrTx,
  workspaceId: string,
  templateId: string,
) {
  const [row] = await tx
    .select()
    .from(contractTemplates)
    .where(
      and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listPropertyContracts(tx: DbOrTx, propertyId: string) {
  return tx
    .select({
      id: contracts.id,
      status: contracts.status,
      createdAt: contracts.createdAt,
      templateName: contractTemplates.name,
      tenantName: contacts.fullName,
    })
    .from(contracts)
    .leftJoin(contractTemplates, eq(contractTemplates.id, contracts.templateId))
    .leftJoin(applications, eq(applications.id, contracts.applicationId))
    .leftJoin(contacts, eq(contacts.id, applications.contactId))
    .where(eq(contracts.propertyId, propertyId))
    .orderBy(desc(contracts.createdAt));
}

export async function getContract(
  tx: DbOrTx,
  workspaceId: string,
  contractId: string,
) {
  const [row] = await tx
    .select({
      contract: contracts,
      templateName: contractTemplates.name,
      templateBody: contractTemplates.bodyMd,
      propertyTitle: properties.title,
      propertyAddress: properties.address,
      rentAmount: properties.rentAmount,
      depositAmount: properties.depositAmount,
      currency: properties.currency,
    })
    .from(contracts)
    .innerJoin(properties, eq(properties.id, contracts.propertyId))
    .leftJoin(contractTemplates, eq(contractTemplates.id, contracts.templateId))
    .where(
      and(
        eq(contracts.id, contractId),
        eq(properties.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getContractParties(tx: DbOrTx, propertyId: string) {
  const people = await tx
    .select({
      relation: propertyPeople.relation,
      name: contacts.fullName,
    })
    .from(propertyPeople)
    .innerJoin(contacts, eq(contacts.id, propertyPeople.contactId))
    .where(eq(propertyPeople.propertyId, propertyId));
  return {
    landlord: people.find((p) => p.relation === "owner")?.name ?? null,
    tenant: people.find((p) => p.relation === "current_tenant")?.name ?? null,
  };
}
