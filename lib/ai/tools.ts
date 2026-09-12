import { tool } from "ai";
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  applications,
  bookings,
  contacts,
  conversations,
  inventoryItems,
  messages,
  pipelineStages,
  properties,
  propertyPeople,
  reminders,
  viewingSlots,
} from "@/lib/db/schema";
import { monthRange } from "@/lib/ai/intent";
import type { AskSource } from "@/lib/ai/types";

export type { AskSource };

export function createAskTools(workspaceId: string, timeZone: string) {
  return {
    searchProperties: tool({
      description: "Search properties by title, address, status or rent.",
      inputSchema: z.object({
        query: z.string().optional(),
        status: z.string().optional(),
      }),
      execute: async ({ query, status }) => {
        const where = [
          eq(properties.workspaceId, workspaceId),
          isNull(properties.deletedAt),
        ];
        if (query) {
          const like = `%${query.replace(/[%_]/g, "\\$&")}%`;
          where.push(
            or(
              ilike(properties.title, like),
              sql`${properties.address}->>'city' ilike ${like}`,
              sql`${properties.address}->>'district' ilike ${like}`,
            )!,
          );
        }
        if (status) where.push(eq(properties.status, status as never));
        const rows = await db
          .select({
            id: properties.id,
            title: properties.title,
            status: properties.status,
            rentAmount: properties.rentAmount,
            currency: properties.currency,
          })
          .from(properties)
          .where(and(...where))
          .orderBy(desc(properties.updatedAt))
          .limit(12);
        return {
          properties: rows,
          sources: rows.map((p): AskSource => ({
            kind: "property",
            href: `/properties/${p.id}`,
            title: p.title,
          })),
        };
      },
    }),
    getPropertyDetail: tool({
      description: "Inventory, people and basics for one property.",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) => {
        const [property] = await db
          .select({
            id: properties.id,
            title: properties.title,
            status: properties.status,
            description: properties.description,
            rentAmount: properties.rentAmount,
            rooms: properties.rooms,
          })
          .from(properties)
          .where(
            and(
              eq(properties.id, id),
              eq(properties.workspaceId, workspaceId),
              isNull(properties.deletedAt),
            ),
          )
          .limit(1);
        if (!property) return { error: "not_found" };
        const inventory = await db
          .select({
            name: inventoryItems.name,
            quantity: inventoryItems.quantity,
          })
          .from(inventoryItems)
          .where(eq(inventoryItems.propertyId, id));
        const people = await db
          .select({
            relation: propertyPeople.relation,
            name: contacts.fullName,
          })
          .from(propertyPeople)
          .innerJoin(contacts, eq(contacts.id, propertyPeople.contactId))
          .where(eq(propertyPeople.propertyId, id));
        return {
          property,
          inventory,
          people,
          sources: [
            {
              kind: "property" as const,
              href: `/properties/${id}`,
              title: property.title,
            },
          ],
        };
      },
    }),
    listViewings: tool({
      description:
        "List booked viewings. Defaults to the current calendar month in the workspace timezone.",
      inputSchema: z.object({
        propertyId: z.string().uuid().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        status: z
          .enum(["confirmed", "cancelled", "completed", "no_show"])
          .optional(),
      }),
      execute: async ({ propertyId, from, to, status }) => {
        const month = monthRange(timeZone);
        const start = from ? new Date(from) : month.start;
        const end = to ? new Date(to) : month.end;
        const where = [
          eq(properties.workspaceId, workspaceId),
          gte(viewingSlots.startsAt, start),
          lt(viewingSlots.startsAt, end),
        ];
        if (propertyId) where.push(eq(bookings.propertyId, propertyId));
        if (status) where.push(eq(bookings.status, status));
        else where.push(inArray(bookings.status, ["confirmed", "completed"]));
        const rows = await db
          .select({
            id: bookings.id,
            status: bookings.status,
            startsAt: viewingSlots.startsAt,
            propertyId: properties.id,
            propertyTitle: properties.title,
            prospectName: contacts.fullName,
          })
          .from(bookings)
          .innerJoin(viewingSlots, eq(viewingSlots.id, bookings.viewingSlotId))
          .innerJoin(properties, eq(properties.id, bookings.propertyId))
          .innerJoin(contacts, eq(contacts.id, bookings.contactId))
          .where(and(...where))
          .orderBy(viewingSlots.startsAt)
          .limit(50);
        return {
          count: rows.length,
          from: start.toISOString(),
          to: end.toISOString(),
          viewings: rows.map((r) => ({
            ...r,
            startsAt: r.startsAt.toISOString(),
          })),
          sources: [
            {
              kind: "calendar" as const,
              href: "/calendar",
              title: "Calendar",
            },
            ...uniqueSources(
              rows.map((r) => ({
                kind: "property" as const,
                href: `/properties/${r.propertyId}/viewings`,
                title: r.propertyTitle,
              })),
            ),
          ],
        };
      },
    }),
    listApplications: tool({
      description:
        "Applicants in the pipeline, optionally by property or stage.",
      inputSchema: z.object({
        propertyId: z.string().uuid().optional(),
        stage: z.string().optional(),
      }),
      execute: async ({ propertyId, stage }) => {
        const where = [eq(properties.workspaceId, workspaceId)];
        if (propertyId) where.push(eq(applications.propertyId, propertyId));
        if (stage) where.push(eq(pipelineStages.name, stage));
        const rows = await db
          .select({
            id: applications.id,
            score: applications.score,
            propertyId: properties.id,
            propertyTitle: properties.title,
            applicant: contacts.fullName,
            stage: pipelineStages.name,
          })
          .from(applications)
          .innerJoin(properties, eq(properties.id, applications.propertyId))
          .innerJoin(contacts, eq(contacts.id, applications.contactId))
          .leftJoin(pipelineStages, eq(pipelineStages.id, applications.stageId))
          .where(and(...where))
          .orderBy(desc(applications.createdAt))
          .limit(30);
        return {
          count: rows.length,
          applications: rows,
          sources: uniqueSources(
            rows.map((r) => ({
              kind: "application" as const,
              href: `/properties/${r.propertyId}/applications`,
              title: `${r.applicant} · ${r.propertyTitle}`,
            })),
          ),
        };
      },
    }),
    searchConversations: tool({
      description: "Search inbox conversations by subject or summary.",
      inputSchema: z.object({
        query: z.string(),
        propertyId: z.string().uuid().optional(),
      }),
      execute: async ({ query, propertyId }) => {
        const like = `%${query.replace(/[%_]/g, "\\$&")}%`;
        const where = [eq(conversations.workspaceId, workspaceId)];
        if (propertyId) where.push(eq(conversations.propertyId, propertyId));
        where.push(
          or(
            ilike(conversations.subject, like),
            ilike(conversations.aiSummary, like),
            sql`exists (select 1 from ${messages} m where m.conversation_id = ${conversations.id} and m.body ilike ${like})`,
          )!,
        );
        const rows = await db
          .select({
            id: conversations.id,
            subject: conversations.subject,
            propertyId: conversations.propertyId,
            contact: contacts.fullName,
          })
          .from(conversations)
          .leftJoin(contacts, eq(contacts.id, conversations.contactId))
          .where(and(...where))
          .orderBy(desc(conversations.lastMessageAt))
          .limit(12);
        return {
          conversations: rows,
          sources: rows.map((c): AskSource => ({
            kind: "conversation",
            href: `/inbox/${c.id}`,
            title: c.subject ?? c.contact ?? "Conversation",
          })),
        };
      },
    }),
    getReminders: tool({
      description:
        "Workspace reminders. Needs attention in a later phase; returns stored rows.",
      inputSchema: z.object({
        status: z.enum(["open", "delivered", "all"]).optional(),
      }),
      execute: async ({ status }) => {
        const where = [eq(reminders.workspaceId, workspaceId)];
        if (status === "open") {
          where.push(sql`${reminders.deliveredAt} is null`);
        } else if (status === "delivered") {
          where.push(sql`${reminders.deliveredAt} is not null`);
        }
        const rows = await db
          .select({
            id: reminders.id,
            kind: reminders.kind,
            message: reminders.message,
            dueAt: reminders.dueAt,
          })
          .from(reminders)
          .where(and(...where))
          .orderBy(reminders.dueAt)
          .limit(20);
        return { reminders: rows };
      },
    }),
  };
}

function uniqueSources(items: AskSource[]) {
  const seen = new Set<string>();
  return items.filter((s) => {
    if (seen.has(s.href)) return false;
    seen.add(s.href);
    return true;
  });
}
