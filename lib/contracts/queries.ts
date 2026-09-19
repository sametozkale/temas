import { and, desc, eq } from "drizzle-orm";

import type { DbOrTx } from "@/lib/db";
import {
  applications,
  contacts,
  contractTemplates,
  contracts,
  inventoryItems,
  profiles,
  properties,
  propertyPeople,
} from "@/lib/db/schema";
import {
  seedTemplatesMissing,
  shouldReplaceStarterBody,
  starterTemplateByName,
  templateKindForName,
} from "@/lib/contracts/seed";
import { TEMPLATE_KIND_ORDER } from "@/lib/contracts/placeholders";

export async function ensureContractTemplates(tx: DbOrTx, workspaceId: string) {
  const existing = await tx
    .select({
      id: contractTemplates.id,
      name: contractTemplates.name,
      bodyMd: contractTemplates.bodyMd,
    })
    .from(contractTemplates)
    .where(eq(contractTemplates.workspaceId, workspaceId));

  for (const row of existing) {
    const starter = starterTemplateByName(row.name);
    if (!starter || !shouldReplaceStarterBody(row.bodyMd)) continue;
    await tx
      .update(contractTemplates)
      .set({ bodyMd: starter.bodyMd, variables: starter.variables })
      .where(eq(contractTemplates.id, row.id));
  }

  const missing = seedTemplatesMissing(existing.map((row) => row.name));
  if (missing.length === 0) return;
  await tx.insert(contractTemplates).values(
    missing.map((template) => ({
      workspaceId,
      name: template.name,
      bodyMd: template.bodyMd,
      variables: template.variables,
    })),
  );
}

export async function listContractTemplates(tx: DbOrTx, workspaceId: string) {
  await ensureContractTemplates(tx, workspaceId);
  const rows = await tx
    .select()
    .from(contractTemplates)
    .where(eq(contractTemplates.workspaceId, workspaceId));
  const rank = new Map(TEMPLATE_KIND_ORDER.map((kind, index) => [kind, index]));
  return rows.sort((a, b) => {
    const ka = templateKindForName(a.name);
    const kb = templateKindForName(b.name);
    const diff = (rank.get(ka) ?? 99) - (rank.get(kb) ?? 99);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
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
      email: contacts.email,
      phone: contacts.phone,
    })
    .from(propertyPeople)
    .innerJoin(contacts, eq(contacts.id, propertyPeople.contactId))
    .where(eq(propertyPeople.propertyId, propertyId));
  const owner = people.find((p) => p.relation === "owner");
  const tenant = people.find((p) => p.relation === "current_tenant");
  return {
    landlord: owner?.name ?? null,
    landlordEmail: owner?.email ?? null,
    landlordPhone: owner?.phone ?? null,
    tenant: tenant?.name ?? null,
    tenantEmail: tenant?.email ?? null,
    tenantPhone: tenant?.phone ?? null,
  };
}

export async function getContractFillSources(
  tx: DbOrTx,
  propertyId: string,
  assignedUserId: string | null,
) {
  const parties = await getContractParties(tx, propertyId);
  const inventory = await tx
    .select({
      name: inventoryItems.name,
      quantity: inventoryItems.quantity,
      condition: inventoryItems.condition,
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.propertyId, propertyId))
    .orderBy(inventoryItems.name);
  let agentName: string | null = null;
  if (assignedUserId) {
    const [profile] = await tx
      .select({ fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, assignedUserId))
      .limit(1);
    agentName = profile?.fullName ?? null;
  }
  return { parties, inventory, agentName };
}
