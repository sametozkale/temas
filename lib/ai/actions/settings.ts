import { tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  selectWorkspacePlan,
  updateAiPreferences,
  updateNotificationPreferences,
  updateProfile,
  updateWorkspace,
} from "@/app/(app)/settings/actions";
import {
  disconnectGmail,
  disconnectWhatsApp,
} from "@/app/(app)/settings/integrations/actions";
import {
  inviteMember,
  removeMember,
  revokeInvite,
  updateMemberRole,
} from "@/app/(app)/settings/members/actions";
import {
  selectSupportPlan,
  sendPriorityNote,
} from "@/app/(app)/settings/support/actions";
import {
  restoreContractTemplate,
  saveContractTemplate,
} from "@/app/(app)/settings/templates/actions";
import { AI_LANGUAGES, TONES } from "@/lib/ai/types";
import { withUserContext } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
  parseNotificationPrefs,
} from "@/lib/notifications/prefs";
import { PLAN_IDS } from "@/lib/plans";
import { INVITE_ROLES, WORKSPACE_ROLES } from "@/lib/roles";
import { SUPPORT_PLAN_IDS } from "@/lib/support";
import { isValidTimezone } from "@/lib/timezones";

import { formOf, fromResult, write, type ActionScope } from "./run";

type Change = { field: string; before: string | null; after: string | null };

function diff(
  before: Record<string, string | null>,
  patch: Record<string, string | null | undefined>,
): Change[] {
  return Object.entries(patch)
    .filter(([, v]) => v !== undefined)
    .map(([field, after]) => ({ field, before: before[field] ?? null, after: after ?? null }));
}

async function loadProfile(userId: string) {
  const [row] = await withUserContext(userId, (tx) =>
    tx
      .select({
        fullName: profiles.fullName,
        phone: profiles.phone,
        aiSignature: profiles.aiSignature,
        aiLanguage: profiles.aiLanguage,
        aiTone: profiles.aiTone,
        notificationPrefs: profiles.notificationPrefs,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1),
  );
  return row;
}

/** Workspace, profile, members, templates, billing, support and integrations. */
export function settingsTools(scope: ActionScope) {
  const { ctx } = scope;

  return {
    updateProfile: tool({
      description: "Change the caller's own name, phone or email signature. Only send what changes.",
      inputSchema: z.object({
        fullName: z.string().min(2).max(80).optional(),
        phone: z.string().max(32).optional(),
        signature: z.string().max(800).optional(),
      }),
      execute: async (patch) =>
        write(scope, async () => {
          const current = await loadProfile(ctx.user.id);
          const before = {
            fullName: current?.fullName ?? "",
            phone: current?.phone ?? "",
            signature: current?.aiSignature ?? "",
          };
          return fromResult(
            await updateProfile(undefined, formOf({ ...before, ...patch })),
            { summary: "Profile updated.", href: "/settings", changes: diff(before, patch) },
          );
        }),
    }),

    updateAiPreferences: tool({
      description: "Change the caller's AI reply language or tone.",
      inputSchema: z.object({
        language: z.enum(AI_LANGUAGES).optional(),
        tone: z.enum(TONES).optional(),
      }),
      execute: async (patch) =>
        write(scope, async () => {
          const current = await loadProfile(ctx.user.id);
          const before = {
            language: current?.aiLanguage ?? "en",
            tone: current?.aiTone ?? "friendly",
          };
          return fromResult(
            await updateAiPreferences(undefined, formOf({ ...before, ...patch })),
            { summary: "AI preferences saved.", href: "/settings/ai", changes: diff(before, patch) },
          );
        }),
    }),

    updateNotificationPreference: tool({
      description: "Turn one notification on or off for the caller, per channel.",
      inputSchema: z.object({
        type: z.enum(NOTIFICATION_TYPES),
        channel: z.enum(NOTIFICATION_CHANNELS),
        enabled: z.boolean(),
      }),
      execute: async ({ type, channel, enabled }) =>
        write(scope, async () => {
          const current = await loadProfile(ctx.user.id);
          const prefs = parseNotificationPrefs(current?.notificationPrefs);
          const before = prefs[type][channel];
          prefs[type] = { ...prefs[type], [channel]: enabled };
          return fromResult(
            await updateNotificationPreferences(
              undefined,
              formOf({ prefs: JSON.stringify(prefs) }),
            ),
            {
              summary: `${type} ${channel} notifications ${enabled ? "on" : "off"}.`,
              href: "/settings/notifications",
              changes: [{ field: `${type}.${channel}`, before: String(before), after: String(enabled) }],
            },
          );
        }),
    }),

    updateWorkspace: tool({
      description: "Rename the workspace, set its legal name or timezone (IANA). Needs confirmation.",
      inputSchema: z.object({
        name: z.string().min(2).max(80).optional(),
        legalName: z.string().max(120).optional(),
        timezone: z.string().refine(isValidTimezone, "invalid_timezone").optional(),
      }),
      execute: async (patch) =>
        write(scope, async () => {
          const before = {
            name: ctx.workspace.name,
            legalName: ctx.workspace.legalName ?? "",
            timezone: ctx.workspace.timezone,
          };
          return fromResult(
            await updateWorkspace(undefined, formOf({ ...before, ...patch })),
            { summary: "Workspace updated.", href: "/settings/workspace", changes: diff(before, patch) },
          );
        }),
    }),

    selectWorkspacePlan: tool({
      description: "Switch the workspace plan and billing interval. Owner only. Needs confirmation.",
      inputSchema: z.object({
        plan: z.enum(PLAN_IDS),
        interval: z.enum(["month", "year"]),
      }),
      execute: async ({ plan, interval }) =>
        write(scope, async () =>
          fromResult(await selectWorkspacePlan(plan, interval), {
            summary: `Plan set to ${plan} (${interval}ly).`,
            href: "/settings/billing",
            changes: [
              { field: "plan", before: ctx.workspace.plan, after: plan },
              { field: "interval", before: ctx.workspace.billingInterval, after: interval },
            ],
          }),
        ),
    }),

    inviteMember: tool({
      description: "Invite someone to the workspace by email as agent or assistant. Needs confirmation.",
      inputSchema: z.object({
        email: z.string().email(),
        role: z.enum(INVITE_ROLES),
      }),
      execute: async (input) =>
        write(scope, async () =>
          fromResult(await inviteMember(undefined, formOf(input)), {
            summary: `Invited ${input.email} as ${input.role}.`,
            href: "/settings/members",
          }),
        ),
    }),

    revokeInvite: tool({
      description: "Revoke a pending invite (inviteId from listMembers). Needs confirmation.",
      inputSchema: z.object({ inviteId: z.string().uuid() }),
      execute: async ({ inviteId }) =>
        write(scope, async () =>
          fromResult(await revokeInvite(inviteId), {
            summary: "Invite revoked.",
            href: "/settings/members",
          }),
        ),
    }),

    updateMemberRole: tool({
      description: "Change a member's role (memberId from listMembers). Needs confirmation.",
      inputSchema: z.object({
        memberId: z.string().uuid(),
        role: z.enum(WORKSPACE_ROLES),
      }),
      execute: async ({ memberId, role }) =>
        write(scope, async () =>
          fromResult(await updateMemberRole(memberId, role), {
            summary: `Member is now ${role}.`,
            href: "/settings/members",
          }),
        ),
    }),

    removeMember: tool({
      description: "Remove a member from the workspace (memberId from listMembers). Needs confirmation.",
      inputSchema: z.object({ memberId: z.string().uuid() }),
      execute: async ({ memberId }) =>
        write(scope, async () =>
          fromResult(await removeMember(memberId), {
            summary: "Member removed from the workspace.",
            href: "/settings/members",
          }),
        ),
    }),

    saveContractTemplate: tool({
      description:
        "Create a contract template, or replace an existing one's name and body (id from listContractTemplates). Use {{variable}} placeholders. Needs confirmation.",
      inputSchema: z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(2).max(120),
        bodyMd: z.string().min(10).max(40_000),
      }),
      execute: async (input) =>
        write(scope, async () => {
          const res = await saveContractTemplate(undefined, formOf(input));
          return fromResult(res, {
            summary: input.id ? `Template "${input.name}" saved.` : `Template "${input.name}" created.`,
            href: res.ok && res.data?.id ? `/settings/templates/${res.data.id}` : "/settings/templates",
          });
        }),
    }),

    restoreContractTemplate: tool({
      description: "Reset a built-in contract template to its original text. Needs confirmation.",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) =>
        write(scope, async () =>
          fromResult(await restoreContractTemplate(id), {
            summary: "Template restored to the original.",
            href: `/settings/templates/${id}`,
          }),
        ),
    }),

    selectSupportPlan: tool({
      description: "Change the caller's support plan. Needs confirmation.",
      inputSchema: z.object({ plan: z.enum(SUPPORT_PLAN_IDS) }),
      execute: async ({ plan }) =>
        write(scope, async () =>
          fromResult(await selectSupportPlan(plan), {
            summary: `Support plan set to ${plan}.`,
            href: "/settings/support",
          }),
        ),
    }),

    sendPriorityNote: tool({
      description: "Send a note to Temas support (priority support plan only). Needs confirmation.",
      inputSchema: z.object({
        subject: z.string().min(2).max(160),
        body: z.string().min(10).max(4000),
      }),
      execute: async (input) =>
        write(scope, async () =>
          fromResult(await sendPriorityNote(undefined, formOf(input)), {
            summary: "Note sent to support.",
            href: "/settings/support",
          }),
        ),
    }),

    disconnectIntegration: tool({
      description: "Disconnect the caller's Gmail or the workspace WhatsApp number. Needs confirmation.",
      inputSchema: z.object({ integration: z.enum(["gmail", "whatsapp"]) }),
      execute: async ({ integration }) =>
        write(scope, async () =>
          fromResult(
            integration === "gmail" ? await disconnectGmail() : await disconnectWhatsApp(),
            {
              summary: `${integration === "gmail" ? "Gmail" : "WhatsApp"} disconnected.`,
              href: `/settings/integrations/${integration}`,
            },
          ),
        ),
    }),
  };
}
