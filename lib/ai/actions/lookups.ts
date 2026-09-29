import { tool } from "ai";
import { and, asc, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { loadGoogleOverlay } from "@/lib/calendar/google";
import { presentGoogleSwatches } from "@/lib/calendar/google-palette";
import { withUserContext } from "@/lib/db";
import {
  invites,
  profiles,
  properties,
  tasks,
  viewingCalendars,
  viewingSlots,
  workspaceMembers,
} from "@/lib/db/schema";
import { listContractTemplates } from "@/lib/contracts/queries";
import { formatDateTime } from "@/lib/format";
import { listStages } from "@/lib/pipeline/queries";

import type { ActionScope } from "./run";

/** Read-only lookups that give write tools the ids they need. */
export function lookupTools(scope: ActionScope) {
  const { ctx } = scope;
  const read = <T>(fn: Parameters<typeof withUserContext<T>>[1]) =>
    withUserContext(ctx.user.id, fn);

  return {
    listTasks: tool({
      description:
        "List workspace tasks (id, title, status, priority, assignee, property). Use before updating or completing a task.",
      inputSchema: z.object({
        status: z.enum(["open", "suggested", "done", "all"]).optional(),
        propertyId: z.string().uuid().optional(),
      }),
      execute: async ({ status, propertyId }) =>
        read(async (tx) => {
          const where = [eq(tasks.workspaceId, ctx.workspace.id)];
          if (status && status !== "all") where.push(eq(tasks.status, status));
          else if (!status) where.push(inArray(tasks.status, ["open", "suggested"]));
          if (propertyId) where.push(eq(tasks.propertyId, propertyId));
          const rows = await tx
            .select({
              id: tasks.id,
              title: tasks.title,
              status: tasks.status,
              priority: tasks.priority,
              assigneeId: tasks.assigneeId,
              propertyId: tasks.propertyId,
            })
            .from(tasks)
            .where(and(...where))
            .orderBy(desc(tasks.createdAt))
            .limit(40);
          return { tasks: rows.map((r) => ({ ...r, href: "/tasks" })) };
        }),
    }),

    listMembers: tool({
      description:
        "Workspace members and pending invites. userId is for assignees; memberId is for role changes and removal.",
      inputSchema: z.object({}),
      execute: async () =>
        read(async (tx) => {
          const members = await tx
            .select({
              memberId: workspaceMembers.id,
              userId: workspaceMembers.userId,
              role: workspaceMembers.role,
              name: profiles.fullName,
            })
            .from(workspaceMembers)
            .leftJoin(profiles, eq(profiles.id, workspaceMembers.userId))
            .where(eq(workspaceMembers.workspaceId, ctx.workspace.id))
            .orderBy(asc(workspaceMembers.createdAt));
          const pending = await tx
            .select({ id: invites.id, email: invites.email, role: invites.role })
            .from(invites)
            .where(
              and(
                eq(invites.workspaceId, ctx.workspace.id),
                isNull(invites.acceptedAt),
              ),
            );
          return {
            you: ctx.user.id,
            members,
            invites: pending,
          };
        }),
    }),

    listOpenSlots: tool({
      description:
        "Open viewing slots for one property (slotId, start in ISO and local label). Use before booking or rescheduling.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        from: z.string().datetime({ offset: true }).optional(),
      }),
      execute: async ({ propertyId, from }) =>
        read(async (tx) => {
          const [property] = await tx
            .select({
              timezone: properties.timezone,
              calendarId: viewingCalendars.id,
            })
            .from(properties)
            .leftJoin(viewingCalendars, eq(viewingCalendars.propertyId, properties.id))
            .where(
              and(
                eq(properties.id, propertyId),
                eq(properties.workspaceId, ctx.workspace.id),
              ),
            )
            .limit(1);
          if (!property) return { error: "not_found" };
          if (!property.calendarId) return { error: "no_calendar", slots: [] };
          const rows = await tx
            .select({ id: viewingSlots.id, startsAt: viewingSlots.startsAt })
            .from(viewingSlots)
            .where(
              and(
                eq(viewingSlots.viewingCalendarId, property.calendarId),
                eq(viewingSlots.status, "open"),
                gte(viewingSlots.startsAt, from ? new Date(from) : new Date()),
              ),
            )
            .orderBy(viewingSlots.startsAt)
            .limit(40);
          return {
            timezone: property.timezone,
            slots: rows.map((s) => ({
              slotId: s.id,
              startsAt: s.startsAt.toISOString(),
              label: formatDateTime(s.startsAt, property.timezone),
            })),
          };
        }),
    }),

    listPipelineStages: tool({
      description: "Pipeline stages (stageId, name) for one property.",
      inputSchema: z.object({ propertyId: z.string().uuid() }),
      execute: async ({ propertyId }) =>
        read(async (tx) => {
          const stages = await listStages(tx, propertyId);
          return {
            stages: stages.map((s) => ({
              stageId: s.id,
              name: s.name,
              isTerminal: s.isTerminal,
            })),
          };
        }),
    }),

    listContractTemplates: tool({
      description: "Contract templates (templateId, name) for drafting contracts.",
      inputSchema: z.object({}),
      execute: async () =>
        read(async (tx) => {
          const rows = await listContractTemplates(tx, ctx.workspace.id);
          return {
            templates: rows.map((r) => ({ templateId: r.id, name: r.name })),
          };
        }),
    }),

    listCalendarEvents: tool({
      description:
        "The caller's Google Calendar events in a date range (default the next 7 days), with calendarId, eventId and the colour options for setGoogleEventColor.",
      inputSchema: z.object({
        from: z.string().date().optional().describe("YYYY-MM-DD"),
        days: z.number().int().min(1).max(31).optional(),
      }),
      execute: async ({ from, days }) => {
        const timeZone = ctx.workspace.timezone;
        const start = from ? new Date(`${from}T00:00:00Z`) : new Date();
        const end = new Date(start.getTime() + (days ?? 7) * 86_400_000);
        const overlay = await loadGoogleOverlay(ctx.user.id, start, end, timeZone, (d) =>
          new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(d),
        );
        if (overlay.status !== "ready") return { status: overlay.status, events: [] };
        const seen = new Set<string>();
        const events = overlay.events.filter((e) => {
          const key = `${e.calendarId}:${e.seriesKey}:${e.day}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return {
          status: overlay.status,
          canColor: overlay.canColor,
          events: events.slice(0, 60).map((e) => ({
            calendarId: e.calendarId,
            eventId: e.seriesKey,
            title: e.title,
            day: e.day,
            when: e.when || "all day",
            calendar: e.calendarName,
            writable: e.writable,
            colorId: e.colorId,
          })),
          colors: Object.fromEntries(
            Object.entries(overlay.labels).map(([calendarId, labels]) => [
              calendarId,
              presentGoogleSwatches(labels.length ? labels : overlay.colors).map((s) => ({
                colorId: s.id,
                name: s.name,
              })),
            ]),
          ),
        };
      },
    }),
  };
}
