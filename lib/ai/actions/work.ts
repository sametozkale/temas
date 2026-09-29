import { tool } from "ai";
import { z } from "zod";

import {
  draftReply,
  linkConversationToProperty,
  manageMailbox,
  sendNewMessage,
  sendReply,
} from "@/app/(app)/inbox/actions";
import {
  addStage,
  moveApplication,
  renameStage,
  rotateOwnerLink,
  saveForm,
} from "@/app/(app)/properties/[id]/applications/actions";
import {
  exportContract,
  saveContractBody,
  setContractDisclaimer,
} from "@/app/(app)/properties/[id]/contracts/actions";
import {
  bookViewing,
  cancelViewing,
  ensureViewingCalendar,
  rescheduleViewing,
  saveAgentWeek,
  updateCalendarSettings,
} from "@/app/(app)/properties/[id]/viewings/actions";
import {
  acceptTask,
  createTask,
  dismissTask,
  patchTask,
  setTaskDone,
} from "@/app/(app)/tasks/actions";
import { setGoogleEventColor } from "@/app/(app)/calendar/actions";
import { TONES } from "@/lib/ai/types";
import { createContractCore } from "@/lib/contracts/mutations";
import { withUserContext } from "@/lib/db";
import { TASK_PRIORITIES } from "@/lib/db/schema/tasks";
import { MAILBOX_ACTIONS } from "@/lib/inbox/mailbox";
import { ensurePipeline } from "@/lib/pipeline/ensure";
import { getFormByProperty } from "@/lib/pipeline/queries";
import { publicAppUrl } from "@/lib/app-url";
import { getCalendarByProperty } from "@/lib/viewings/queries";
import { emptyWeek, WEEKDAYS } from "@/lib/viewings/week";
import { parseTimeToMinutes } from "@/lib/slots";

import { fail, formOf, fromResult, write, type ActionScope } from "./run";

const slotTarget = {
  slotId: z.string().uuid().optional().describe("From listOpenSlots"),
  startsAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe("Exact ISO start of an open slot"),
};

/** Tasks, pipeline, viewings, inbox, contracts and calendar. */
export function workTools(scope: ActionScope) {
  const { ctx } = scope;

  return {
    createTask: tool({
      description:
        "Create a task. Assignee defaults to the caller; link a property when the task is about one.",
      inputSchema: z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        propertyId: z.string().uuid().optional(),
        priority: z.enum(TASK_PRIORITIES).optional(),
        assigneeId: z.string().uuid().optional(),
      }),
      execute: async (input) =>
        write(scope, async () =>
          fromResult(
            await createTask(
              undefined,
              formOf({
                title: input.title,
                description: input.description,
                propertyId: input.propertyId,
                priority: input.priority,
                assigneeId: input.assigneeId ?? ctx.user.id,
              }),
            ),
            { summary: `Created task "${input.title}".`, href: "/tasks", hrefLabel: input.title },
          ),
        ),
    }),

    updateTask: tool({
      description: "Rename a task, change its priority or reassign it.",
      inputSchema: z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        priority: z.enum(TASK_PRIORITIES).optional(),
        assigneeId: z.string().uuid().optional(),
      }),
      execute: async (input) =>
        write(scope, async () =>
          fromResult(await patchTask(input), {
            summary: "Task updated.",
            href: "/tasks",
            changes: (["title", "priority", "assigneeId"] as const)
              .filter((k) => input[k] !== undefined)
              .map((k) => ({ field: k, before: null, after: String(input[k]) })),
          }),
        ),
    }),

    setTaskDone: tool({
      description: "Mark an open task done, or reopen a done task.",
      inputSchema: z.object({ id: z.string().uuid(), done: z.boolean() }),
      execute: async ({ id, done }) =>
        write(scope, async () =>
          fromResult(await setTaskDone(id, done), {
            summary: done ? "Task marked done." : "Task reopened.",
            href: "/tasks",
          }),
        ),
    }),

    acceptTask: tool({
      description: "Accept a suggested task so it becomes open.",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) =>
        write(scope, async () =>
          fromResult(await acceptTask(id), { summary: "Suggestion accepted.", href: "/tasks" }),
        ),
    }),

    dismissTask: tool({
      description: "Dismiss a suggested task.",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) =>
        write(scope, async () =>
          fromResult(await dismissTask(id), { summary: "Suggestion dismissed.", href: "/tasks" }),
        ),
    }),

    moveApplication: tool({
      description: "Move an applicant to another pipeline stage (stageId from listPipelineStages).",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        applicationId: z.string().uuid(),
        stageId: z.string().uuid(),
      }),
      execute: async ({ propertyId, applicationId, stageId }) =>
        write(scope, async () =>
          fromResult(await moveApplication(propertyId, applicationId, stageId), {
            summary: "Applicant moved.",
            href: `/properties/${propertyId}/pipeline`,
          }),
        ),
    }),

    addPipelineStage: tool({
      description: "Add a pipeline stage to a property.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        name: z.string().min(1).max(60),
        isTerminal: z.boolean().optional(),
      }),
      execute: async ({ propertyId, name, isTerminal }) =>
        write(scope, async () =>
          fromResult(await addStage(propertyId, { name, isTerminal }), {
            summary: `Added stage "${name}".`,
            href: `/properties/${propertyId}/pipeline`,
          }),
        ),
    }),

    renamePipelineStage: tool({
      description: "Rename a pipeline stage.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        stageId: z.string().uuid(),
        name: z.string().min(1).max(60),
      }),
      execute: async ({ propertyId, stageId, name }) =>
        write(scope, async () =>
          fromResult(await renameStage(propertyId, stageId, { name }), {
            summary: `Stage renamed to "${name}".`,
            href: `/properties/${propertyId}/pipeline`,
          }),
        ),
    }),

    setFormPublished: tool({
      description: "Publish or unpublish a property's application form. Needs confirmation.",
      inputSchema: z.object({ propertyId: z.string().uuid(), published: z.boolean() }),
      execute: async ({ propertyId, published }) =>
        write(scope, async () => {
          const form = await withUserContext(ctx.user.id, async (tx) => {
            await ensurePipeline(tx, propertyId);
            return getFormByProperty(tx, propertyId);
          });
          if (!form) return fail("not_found");
          return fromResult(
            await saveForm(propertyId, {
              title: form.title,
              schema: form.schema,
              isPublished: published,
            }),
            {
              summary: published ? "Application form published." : "Application form unpublished.",
              href: `/properties/${propertyId}/applications`,
            },
          );
        }),
    }),

    rotateOwnerLink: tool({
      description:
        "Issue a new owner presentation link for a property; the old link stops working. Needs confirmation.",
      inputSchema: z.object({ propertyId: z.string().uuid() }),
      execute: async ({ propertyId }) =>
        write(scope, async () => {
          const res = await rotateOwnerLink(propertyId);
          return fromResult(res, {
            summary: "New owner link issued; the old one no longer opens.",
            href: `/properties/${propertyId}/pipeline`,
            url: res.ok ? res.data?.url : undefined,
          });
        }),
    }),

    createViewingCalendar: tool({
      description: "Create the viewing calendar for a property. Needs confirmation.",
      inputSchema: z.object({ propertyId: z.string().uuid() }),
      execute: async ({ propertyId }) =>
        write(scope, async () =>
          fromResult(await ensureViewingCalendar(propertyId), {
            summary: "Viewing calendar created.",
            href: `/properties/${propertyId}/viewings`,
          }),
        ),
    }),

    updateCalendarSettings: tool({
      description:
        "Change viewing settings: slot length, buffer, minimum notice, days ahead, publish the booking link, require the form first. Only send what changes. Needs confirmation.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        slotDurationMin: z.number().int().min(15).max(180).optional(),
        bufferMin: z.number().int().min(0).max(120).optional(),
        minNoticeHours: z.number().int().min(0).max(72).optional(),
        maxDaysAhead: z.number().int().min(1).max(90).optional(),
        isPublished: z.boolean().optional(),
        requireFormFirst: z.boolean().optional(),
      }),
      execute: async ({ propertyId, ...patch }) =>
        write(scope, async () => {
          const found = await withUserContext(ctx.user.id, async (tx) => ({
            calendar: await getCalendarByProperty(tx, propertyId),
            form: await getFormByProperty(tx, propertyId),
          }));
          if (!found.calendar) return fail("no_calendar");
          const c = found.calendar;
          const next = {
            slotDurationMin: c.slotDurationMin,
            bufferMin: c.bufferMin,
            minNoticeHours: c.minNoticeHours,
            maxDaysAhead: c.maxDaysAhead,
            isPublished: c.isPublished,
            requireFormFirst: c.requireFormFirst,
            formId: c.formId ?? found.form?.id ?? null,
            ...patch,
          };
          return fromResult(await updateCalendarSettings(propertyId, next), {
            summary: "Viewing settings saved.",
            href: `/properties/${propertyId}/viewings`,
            changes: Object.entries(patch).map(([field, after]) => ({
              field,
              before: String(c[field as keyof typeof c] ?? ""),
              after: String(after),
            })),
          });
        }),
    }),

    setAgentAvailability: tool({
      description:
        "Replace the caller's weekly viewing availability on a property. Days not listed become unavailable. Times are HH:MM in the property timezone. Needs confirmation.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        days: z
          .array(
            z
              .object({
                weekday: z.enum(WEEKDAYS),
                start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
                end: z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/),
              })
              .refine((day) => day.end > day.start, { path: ["end"], message: "end_before_start" }),
          )
          .max(7),
      }),
      execute: async ({ propertyId, days }) =>
        write(scope, async () => {
          const week = emptyWeek().map((cell) => {
            const day = days.find((d) => d.weekday === cell.weekday);
            return day
              ? {
                  ...cell,
                  enabled: true,
                  startMin: parseTimeToMinutes(day.start),
                  endMin: parseTimeToMinutes(day.end),
                }
              : cell;
          });
          return fromResult(await saveAgentWeek(propertyId, week), {
            summary: "Weekly availability saved.",
            href: `/properties/${propertyId}/viewings`,
          });
        }),
    }),

    bookViewing: tool({
      description:
        "Book an open slot for a prospect on the agent's behalf. Needs an email or phone for the prospect, and a slotId or startsAt from listOpenSlots. Needs confirmation.",
      inputSchema: z
        .object({
          propertyId: z.string().uuid(),
          ...slotTarget,
          fullName: z.string().min(2).max(120),
          email: z.string().email().optional(),
          phone: z.string().max(32).optional(),
          note: z.string().max(500).optional(),
        })
        .refine((v) => v.slotId || v.startsAt, { path: ["slotId"], message: "slot" })
        .refine((v) => v.email || v.phone, { path: ["email"], message: "contact" }),
      execute: async (input) =>
        write(scope, async () => {
          const res = await bookViewing(input);
          return fromResult(res, {
            summary: res.ok
              ? `Booked ${input.fullName} for ${res.data?.whenLabel} at "${res.data?.propertyTitle}".`
              : "",
            href: `/properties/${input.propertyId}/viewings`,
            hrefLabel: res.ok ? res.data?.propertyTitle : undefined,
          });
        }),
    }),

    cancelViewing: tool({
      description: "Cancel a booked viewing (bookingId from listViewings). Everyone is told. Needs confirmation.",
      inputSchema: z.object({
        bookingId: z.string().uuid(),
        reason: z.string().max(300).optional(),
      }),
      execute: async (input) =>
        write(scope, async () => {
          const res = await cancelViewing(input);
          return fromResult(res, {
            summary: res.ok ? `Cancelled the viewing on ${res.data?.whenLabel}.` : "",
            href: res.ok ? `/properties/${res.data?.propertyId}/viewings` : undefined,
            hrefLabel: res.ok ? res.data?.propertyTitle : undefined,
          });
        }),
    }),

    rescheduleViewing: tool({
      description: "Move a booked viewing to another open slot. Everyone is told. Needs confirmation.",
      inputSchema: z.object({ bookingId: z.string().uuid(), ...slotTarget }),
      execute: async (input) =>
        write(scope, async () => {
          const res = await rescheduleViewing(input);
          return fromResult(res, {
            summary: res.ok
              ? `Moved the viewing from ${res.data?.previousWhenLabel} to ${res.data?.whenLabel}.`
              : "",
            href: res.ok ? `/properties/${res.data?.propertyId}/viewings` : undefined,
            hrefLabel: res.ok ? res.data?.propertyTitle : undefined,
            changes: res.ok
              ? [{ field: "time", before: res.data!.previousWhenLabel, after: res.data!.whenLabel }]
              : undefined,
          });
        }),
    }),

    sendReply: tool({
      description:
        "Send a reply in one of the caller's inbox conversations (email or WhatsApp). Write the full body. Needs confirmation.",
      inputSchema: z.object({
        conversationId: z.string().uuid(),
        body: z.string().min(1).max(10_000),
      }),
      execute: async ({ conversationId, body }) =>
        write(scope, async () =>
          fromResult(await sendReply(conversationId, undefined, formOf({ body })), {
            summary: "Reply sent.",
            href: `/inbox/${conversationId}`,
          }),
        ),
    }),

    sendEmail: tool({
      description: "Compose and send a new email from the caller's Gmail. Needs confirmation.",
      inputSchema: z.object({
        to: z.string().email(),
        toName: z.string().max(120).optional(),
        subject: z.string().min(1).max(200),
        body: z.string().min(1).max(10_000),
      }),
      execute: async (input) =>
        write(scope, async () => {
          const res = await sendNewMessage(undefined, formOf(input));
          return fromResult(res, {
            summary: `Email sent to ${input.toName ?? input.to}.`,
            href: res.ok ? `/inbox/${res.data?.conversationId}` : undefined,
          });
        }),
    }),

    manageMailbox: tool({
      description:
        "Archive, mark unread, star/unstar, report spam or trash an email conversation. Spam and trash need confirmation.",
      inputSchema: z.object({
        conversationId: z.string().uuid(),
        action: z.enum(MAILBOX_ACTIONS),
      }),
      execute: async ({ conversationId, action }) =>
        write(scope, async () =>
          fromResult(await manageMailbox(conversationId, action), {
            summary: `Conversation: ${action} done.`,
            href: action === "trash" || action === "spam" ? "/inbox" : `/inbox/${conversationId}`,
          }),
        ),
    }),

    draftReply: tool({
      description:
        "Write an AI draft reply in a conversation without sending it. The agent reviews it in the inbox.",
      inputSchema: z.object({
        conversationId: z.string().uuid(),
        tone: z.enum(TONES).optional(),
      }),
      execute: async ({ conversationId, tone }) =>
        write(scope, async () => {
          const res = await draftReply(conversationId, tone ?? "friendly");
          return fromResult(res, {
            summary: res.ok ? `Draft ready:\n${res.data?.body}` : "",
            href: `/inbox/${conversationId}`,
          });
        }),
    }),

    linkConversationToProperty: tool({
      description: "Link one of the caller's conversations to a property, or unlink with propertyId null.",
      inputSchema: z.object({
        conversationId: z.string().uuid(),
        propertyId: z.string().uuid().nullable(),
      }),
      execute: async (input) =>
        write(scope, async () => {
          const res = await linkConversationToProperty(input);
          return fromResult(res, {
            summary: input.propertyId
              ? `Conversation linked to "${res.ok ? res.data?.propertyTitle : ""}".`
              : "Conversation unlinked.",
            href: `/inbox/${input.conversationId}`,
          });
        }),
    }),

    createContract: tool({
      description:
        "Draft a contract from a template for a property (templateId from listContractTemplates). Optional applicationId picks the tenant. Needs confirmation.",
      inputSchema: z.object({
        propertyId: z.string().uuid(),
        templateId: z.string().uuid(),
        applicationId: z.string().uuid().optional(),
        rent: z.string().max(40).optional(),
        deposit: z.string().max(40).optional(),
        startDate: z.string().max(40).optional(),
        endDate: z.string().max(40).optional(),
        increaseRate: z.string().max(40).optional(),
        specialClauses: z.string().max(4000).optional(),
      }),
      execute: async (input) =>
        write(scope, async () => {
          const res = await createContractCore(ctx, input);
          return fromResult(res, {
            summary: "Contract draft created. It is not legal advice; review it before use.",
            href: res.ok
              ? `/properties/${res.data?.propertyId}/contracts/${res.data?.id}`
              : undefined,
          });
        }),
    }),

    saveContractBody: tool({
      description: "Replace the markdown body of a contract draft.",
      inputSchema: z.object({
        contractId: z.string().uuid(),
        bodyMd: z.string().min(1).max(80_000),
      }),
      execute: async (input) =>
        write(scope, async () =>
          fromResult(await saveContractBody(undefined, formOf(input)), {
            summary: "Contract text saved.",
          }),
        ),
    }),

    acknowledgeContractDisclaimer: tool({
      description:
        "Record that the agent has read the not-legal-advice disclaimer on a contract (required before export). Needs confirmation.",
      inputSchema: z.object({ contractId: z.string().uuid(), acknowledged: z.boolean() }),
      execute: async ({ contractId, acknowledged }) =>
        write(scope, async () =>
          fromResult(await setContractDisclaimer(contractId, acknowledged), {
            summary: acknowledged ? "Disclaimer acknowledged." : "Disclaimer acknowledgement removed.",
          }),
        ),
    }),

    exportContract: tool({
      description: "Export a contract to DOCX or PDF into the property's Files. Needs confirmation.",
      inputSchema: z.object({
        contractId: z.string().uuid(),
        format: z.enum(["docx", "pdf"]),
      }),
      execute: async ({ contractId, format }) =>
        write(scope, async () =>
          fromResult(await exportContract(contractId, format), {
            summary: `Contract exported as ${format.toUpperCase()} to Files.`,
          }),
        ),
    }),

    setGoogleEventColor: tool({
      description:
        "Change the colour of one of the caller's Google Calendar events (calendarId, eventId and colorId from listCalendarEvents).",
      inputSchema: z.object({
        calendarId: z.string().min(1).max(512),
        eventId: z.string().min(1).max(1024),
        colorId: z.string().min(1).max(64),
      }),
      execute: async (input) =>
        write(scope, async () =>
          fromResult(await setGoogleEventColor(input), {
            summary: "Event colour updated.",
            href: "/calendar",
          }),
        ),
    }),

    openInProduct: tool({
      description:
        "Return a link for things Ask cannot do in chat: connecting Gmail or WhatsApp, switching workspace, signing out, uploading photos by hand.",
      inputSchema: z.object({
        target: z.enum([
          "connect_gmail",
          "connect_whatsapp",
          "switch_workspace",
          "sign_out",
          "billing",
          "members",
        ]),
      }),
      execute: async ({ target }) => {
        const paths = {
          connect_gmail: "/settings/integrations/gmail",
          connect_whatsapp: "/settings/integrations/whatsapp",
          switch_workspace: "/settings",
          sign_out: "/settings",
          billing: "/settings/billing",
          members: "/settings/members",
        } as const;
        return {
          ok: true as const,
          summary: "Open this page to finish in the product.",
          href: paths[target],
          url: new URL(paths[target], await publicAppUrl()).toString(),
        };
      },
    }),
  };
}
