import { and, eq } from "drizzle-orm";

import type { AppContext } from "@/lib/auth";
import { withUserContext, type Tx } from "@/lib/db";
import {
  applications,
  bookings,
  contacts,
  contractTemplates,
  contracts,
  conversations,
  documents,
  inventoryItems,
  invites,
  pipelineStages,
  profiles,
  properties,
  propertyMedia,
  propertyPeople,
  tasks,
  viewingCalendars,
  viewingSlots,
  workspaceMembers,
} from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";

/**
 * One line on an action card naming the record a tool call points at.
 * Built on the server from the ids, so the card never trusts a name the
 * model typed.
 */
export type ActionTarget = { key: string; value: string; id: string };

const TASK_TOOLS = new Set(["updateTask", "setTaskDone", "acceptTask", "dismissTask"]);
const TEMPLATE_TOOLS = new Set(["saveContractTemplate", "restoreContractTemplate"]);

type Resolver = (tx: Tx, ctx: AppContext, id: string) => Promise<string | null>;

const first = <T>(rows: T[]) => rows[0] ?? null;

const property: Resolver = async (tx, ctx, id) =>
  first(
    await tx
      .select({ v: properties.title })
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.workspaceId, ctx.workspace.id)))
      .limit(1),
  )?.v ?? null;

const task: Resolver = async (tx, ctx, id) =>
  first(
    await tx
      .select({ v: tasks.title })
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.workspaceId, ctx.workspace.id)))
      .limit(1),
  )?.v ?? null;

const template: Resolver = async (tx, ctx, id) =>
  first(
    await tx
      .select({ v: contractTemplates.name })
      .from(contractTemplates)
      .where(
        and(eq(contractTemplates.id, id), eq(contractTemplates.workspaceId, ctx.workspace.id)),
      )
      .limit(1),
  )?.v ?? null;

const user: Resolver = async (tx, ctx, id) => {
  const row = first(
    await tx
      .select({ name: profiles.fullName })
      .from(workspaceMembers)
      .leftJoin(profiles, eq(profiles.id, workspaceMembers.userId))
      .where(
        and(eq(workspaceMembers.userId, id), eq(workspaceMembers.workspaceId, ctx.workspace.id)),
      )
      .limit(1),
  );
  return row ? (row.name ?? "—") : null;
};

const member: Resolver = async (tx, ctx, id) => {
  const row = first(
    await tx
      .select({ name: profiles.fullName, role: workspaceMembers.role })
      .from(workspaceMembers)
      .leftJoin(profiles, eq(profiles.id, workspaceMembers.userId))
      .where(and(eq(workspaceMembers.id, id), eq(workspaceMembers.workspaceId, ctx.workspace.id)))
      .limit(1),
  );
  return row ? `${row.name ?? "—"} (${row.role})` : null;
};

const invite: Resolver = async (tx, ctx, id) => {
  const row = first(
    await tx
      .select({ email: invites.email, role: invites.role })
      .from(invites)
      .where(and(eq(invites.id, id), eq(invites.workspaceId, ctx.workspace.id)))
      .limit(1),
  );
  return row ? `${row.email} (${row.role})` : null;
};

const conversation: Resolver = async (tx, ctx, id) => {
  const row = first(
    await tx
      .select({
        name: contacts.fullName,
        email: contacts.email,
        phone: contacts.phone,
        subject: conversations.subject,
        channel: conversations.channel,
      })
      .from(conversations)
      .leftJoin(contacts, eq(contacts.id, conversations.contactId))
      .where(and(eq(conversations.id, id), eq(conversations.workspaceId, ctx.workspace.id)))
      .limit(1),
  );
  if (!row) return null;
  const who = [row.name, row.email ?? row.phone].filter(Boolean).join(" · ");
  return [who || row.channel, row.subject].filter(Boolean).join(" — ");
};

const booking: Resolver = async (tx, ctx, id) => {
  const row = first(
    await tx
      .select({
        name: contacts.fullName,
        startsAt: viewingSlots.startsAt,
        title: properties.title,
        timezone: properties.timezone,
      })
      .from(bookings)
      .innerJoin(properties, eq(properties.id, bookings.propertyId))
      .innerJoin(viewingSlots, eq(viewingSlots.id, bookings.viewingSlotId))
      .leftJoin(contacts, eq(contacts.id, bookings.contactId))
      .where(and(eq(bookings.id, id), eq(properties.workspaceId, ctx.workspace.id)))
      .limit(1),
  );
  if (!row) return null;
  return `${row.name ?? "—"}, ${formatDateTime(row.startsAt, row.timezone)} · ${row.title}`;
};

const slot: Resolver = async (tx, ctx, id) => {
  const row = first(
    await tx
      .select({ startsAt: viewingSlots.startsAt, timezone: properties.timezone })
      .from(viewingSlots)
      .innerJoin(viewingCalendars, eq(viewingCalendars.id, viewingSlots.viewingCalendarId))
      .innerJoin(properties, eq(properties.id, viewingCalendars.propertyId))
      .where(and(eq(viewingSlots.id, id), eq(properties.workspaceId, ctx.workspace.id)))
      .limit(1),
  );
  return row ? formatDateTime(row.startsAt, row.timezone) : null;
};

const contract: Resolver = async (tx, ctx, id) => {
  const row = first(
    await tx
      .select({ title: properties.title, template: contractTemplates.name })
      .from(contracts)
      .innerJoin(properties, eq(properties.id, contracts.propertyId))
      .leftJoin(contractTemplates, eq(contractTemplates.id, contracts.templateId))
      .where(and(eq(contracts.id, id), eq(properties.workspaceId, ctx.workspace.id)))
      .limit(1),
  );
  return row ? [row.template, row.title].filter(Boolean).join(" · ") : null;
};

const document: Resolver = async (tx, ctx, id) =>
  first(
    await tx
      .select({ v: documents.title })
      .from(documents)
      .innerJoin(properties, eq(properties.id, documents.propertyId))
      .where(and(eq(documents.id, id), eq(properties.workspaceId, ctx.workspace.id)))
      .limit(1),
  )?.v ?? null;

const item: Resolver = async (tx, ctx, id) =>
  first(
    await tx
      .select({ v: inventoryItems.name })
      .from(inventoryItems)
      .innerJoin(properties, eq(properties.id, inventoryItems.propertyId))
      .where(and(eq(inventoryItems.id, id), eq(properties.workspaceId, ctx.workspace.id)))
      .limit(1),
  )?.v ?? null;

const media: Resolver = async (tx, ctx, id) => {
  const row = first(
    await tx
      .select({ kind: propertyMedia.kind, sortOrder: propertyMedia.sortOrder })
      .from(propertyMedia)
      .innerJoin(properties, eq(properties.id, propertyMedia.propertyId))
      .where(and(eq(propertyMedia.id, id), eq(properties.workspaceId, ctx.workspace.id)))
      .limit(1),
  );
  if (!row) return null;
  const kind = row.kind === "plan" ? "Plan" : row.kind === "video" ? "Video" : "Photo";
  return `${kind} ${row.sortOrder + 1}`;
};

const person: Resolver = async (tx, ctx, id) => {
  const row = first(
    await tx
      .select({ name: contacts.fullName, relation: propertyPeople.relation })
      .from(propertyPeople)
      .innerJoin(contacts, eq(contacts.id, propertyPeople.contactId))
      .innerJoin(properties, eq(properties.id, propertyPeople.propertyId))
      .where(and(eq(propertyPeople.id, id), eq(properties.workspaceId, ctx.workspace.id)))
      .limit(1),
  );
  return row ? `${row.name} (${row.relation.replace("_", " ")})` : null;
};

const applicant: Resolver = async (tx, ctx, id) =>
  first(
    await tx
      .select({ v: contacts.fullName })
      .from(applications)
      .innerJoin(contacts, eq(contacts.id, applications.contactId))
      .innerJoin(properties, eq(properties.id, applications.propertyId))
      .where(and(eq(applications.id, id), eq(properties.workspaceId, ctx.workspace.id)))
      .limit(1),
  )?.v ?? null;

const stage: Resolver = async (tx, ctx, id) =>
  first(
    await tx
      .select({ v: pipelineStages.name })
      .from(pipelineStages)
      .innerJoin(properties, eq(properties.id, pipelineStages.propertyId))
      .where(and(eq(pipelineStages.id, id), eq(properties.workspaceId, ctx.workspace.id)))
      .limit(1),
  )?.v ?? null;

/** Input key → card label key (`home.ask.actions.fields.*`) and lookup. */
const BY_KEY: Record<string, [string, Resolver]> = {
  propertyId: ["property", property],
  assigneeId: ["assignee", user],
  assignedUserId: ["assignee", user],
  mediaId: ["photo", media],
  memberId: ["member", member],
  inviteId: ["invite", invite],
  conversationId: ["conversation", conversation],
  bookingId: ["viewing", booking],
  slotId: ["slot", slot],
  contractId: ["contract", contract],
  templateId: ["template", template],
  documentId: ["document", document],
  itemId: ["item", item],
  personId: ["person", person],
  applicationId: ["applicant", applicant],
  stageId: ["stage", stage],
};

function resolverFor(toolName: string, key: string): [string, Resolver] | null {
  if (key === "id") {
    if (TASK_TOOLS.has(toolName)) return ["task", task];
    if (TEMPLATE_TOOLS.has(toolName)) return ["template", template];
    return null;
  }
  return BY_KEY[key] ?? null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Names every record id in a tool call's input, in input order. */
export async function describeTargets(
  ctx: AppContext,
  toolName: string,
  input: unknown,
): Promise<ActionTarget[]> {
  if (!input || typeof input !== "object") return [];
  const record = input as Record<string, unknown>;
  const nested =
    record.fields && typeof record.fields === "object" && !Array.isArray(record.fields)
      ? (record.fields as Record<string, unknown>)
      : null;
  const refs = [...Object.entries(record), ...(nested ? Object.entries(nested) : [])].flatMap(
    ([key, value]) => {
      if (typeof value !== "string" || !UUID.test(value)) return [];
      const found = resolverFor(toolName, key);
      return found ? [{ label: found[0], resolve: found[1], id: value }] : [];
    },
  );
  if (refs.length === 0) return [];
  try {
    return await withUserContext(ctx.user.id, async (tx) => {
      const rows: ActionTarget[] = [];
      for (const ref of refs) {
        const value = await ref.resolve(tx, ctx, ref.id);
        if (value) rows.push({ key: ref.label, value, id: ref.id });
      }
      return rows;
    });
  } catch (error) {
    console.error("[ask action] describe targets failed", error);
    return [];
  }
}
