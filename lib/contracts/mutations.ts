import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { generateContractDraft } from "@/lib/ai/contract";
import type { AppContext } from "@/lib/auth";
import {
  getContractFillSources,
  getContractTemplate,
} from "@/lib/contracts/queries";
import { buildContractValues } from "@/lib/contracts/values";
import { withUserContext } from "@/lib/db";
import {
  applications,
  contacts,
  contracts,
  properties,
} from "@/lib/db/schema";
import { ForbiddenError, requireAbility } from "@/lib/permissions";
import { workspaceAgencyName } from "@/lib/workspaces/agency-name";

export const createContractSchema = z.object({
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

export type CreateContractInput = z.input<typeof createContractSchema>;

/** Generates a contract draft from a template (docs/05 §5). */
export async function createContractCore(
  ctx: AppContext,
  input: unknown,
): Promise<ActionResult<{ id: string; propertyId: string }>> {
  try {
    requireAbility(ctx.membership, "contracts.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) return actionError("forbidden");
    throw error;
  }

  const parsed = createContractSchema.safeParse(input);
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

      let applicant: {
        name: string;
        email: string | null;
        phone: string | null;
      } | null = null;
      if (applicationId) {
        const [app] = await tx
          .select({
            name: contacts.fullName,
            email: contacts.email,
            phone: contacts.phone,
          })
          .from(applications)
          .innerJoin(contacts, eq(contacts.id, applications.contactId))
          .where(
            and(
              eq(applications.id, applicationId),
              eq(applications.propertyId, property.id),
            ),
          )
          .limit(1);
        applicant = app ?? null;
      }

      const sources = await getContractFillSources(
        tx,
        property.id,
        property.assignedUserId,
      );
      const values = buildContractValues({
        landlordName: sources.parties.landlord,
        landlordEmail: sources.parties.landlordEmail,
        landlordPhone: sources.parties.landlordPhone,
        tenantName: applicant?.name ?? sources.parties.tenant,
        tenantEmail: applicant ? applicant.email : sources.parties.tenantEmail,
        tenantPhone: applicant ? applicant.phone : sources.parties.tenantPhone,
        agencyName: workspaceAgencyName(ctx.workspace),
        agentName: sources.agentName,
        title: property.title,
        type: property.type,
        address: property.address,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        floor: property.floor,
        totalFloors: property.totalFloors,
        areaM2: property.areaM2,
        rent: property.rentAmount,
        deposit: property.depositAmount,
        dues: property.duesAmount,
        currency: property.currency,
        inventory: sources.inventory,
        overrides: {
          rent: parsed.data.rent,
          deposit: parsed.data.deposit,
          start_date: parsed.data.startDate,
          end_date: parsed.data.endDate,
          increase_rate: parsed.data.increaseRate,
          special_clauses: parsed.data.specialClauses,
        },
      });

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
  return actionOk(result);
}
