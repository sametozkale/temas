import { generateObject } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  aiDrafts,
  contacts,
  conversations,
  messages,
  profiles,
  properties,
  viewingCalendars,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { languageInstruction } from "@/lib/ai/languages";
import { isTextConfigured, modelLabel, textModel } from "@/lib/ai/models";
import { loadPrompt } from "@/lib/ai/prompts";
import { TONES, type DraftTone } from "@/lib/ai/types";

export { TONES, type DraftTone };

const draftSchema = z.object({
  body: z.string().min(1).max(8000),
  detectedIntent: z
    .enum(["viewing_request", "question", "follow_up", "other"])
    .default("other"),
  suggestedFollowUpDate: z.string().optional(),
});

export async function generateDraft(input: {
  workspaceId: string;
  userId: string;
  conversationId: string;
  tone: DraftTone;
}) {
  const [row] = await db
    .select({
      conversation: conversations,
      contactName: contacts.fullName,
      propertyTitle: properties.title,
      propertyId: properties.id,
    })
    .from(conversations)
    .leftJoin(contacts, eq(contacts.id, conversations.contactId))
    .leftJoin(properties, eq(properties.id, conversations.propertyId))
    .where(
      and(
        eq(conversations.id, input.conversationId),
        eq(conversations.workspaceId, input.workspaceId),
        eq(conversations.userId, input.userId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new Error("not_found");
  }

  const history = await db
    .select({
      direction: messages.direction,
      body: messages.body,
    })
    .from(messages)
    .where(eq(messages.conversationId, input.conversationId))
    .orderBy(desc(messages.sentAt), desc(messages.createdAt))
    .limit(12);

  const [prefs] = await db
    .select({
      signature: profiles.aiSignature,
      language: profiles.aiLanguage,
    })
    .from(profiles)
    .where(eq(profiles.id, input.userId))
    .limit(1);

  let bookingUrl: string | null = null;
  if (row.propertyId) {
    const [cal] = await db
      .select({
        publicToken: viewingCalendars.publicToken,
        isPublished: viewingCalendars.isPublished,
      })
      .from(viewingCalendars)
      .where(eq(viewingCalendars.propertyId, row.propertyId))
      .limit(1);
    if (cal?.isPublished && cal.publicToken) {
      bookingUrl = new URL(`/b/${cal.publicToken}`, env().APP_URL).toString();
    }
  }

  const thread = [...history].reverse();
  const lastIn = thread.filter((m) => m.direction === "in").at(-1)?.body ?? "";

  const generated = isTextConfigured()
    ? await generateWithModel({
        tone: input.tone,
        language: prefs?.language ?? "auto",
        signature: prefs?.signature ?? "",
        contactName: row.contactName,
        propertyTitle: row.propertyTitle,
        aiSummary: row.conversation.aiSummary,
        bookingUrl,
        messages: thread,
      })
    : mockDraft({
        tone: input.tone,
        language: prefs?.language ?? "auto",
        contactName: row.contactName,
        propertyTitle: row.propertyTitle,
        bookingUrl,
        lastIn,
      });

  let body = generated.body.trim();
  if (
    generated.detectedIntent === "viewing_request" &&
    bookingUrl &&
    !body.includes(bookingUrl)
  ) {
    body = `${body}\n\n${bookingUrl}`;
  }
  if (prefs?.signature && !body.includes(prefs.signature)) {
    body = `${body}\n\n${prefs.signature}`;
  }

  const [draft] = await db
    .insert(aiDrafts)
    .values({
      conversationId: input.conversationId,
      body,
      tone: input.tone,
      status: "pending",
      model: modelLabel("sonnet"),
    })
    .returning({ id: aiDrafts.id, body: aiDrafts.body });

  return {
    id: draft!.id,
    body: draft!.body,
    detectedIntent: generated.detectedIntent,
  };
}

async function generateWithModel(payload: Record<string, unknown>) {
  const model = textModel("sonnet");
  if (!model) {
    return draftSchema.parse({
      body: "Thank you for your message. I will follow up shortly.",
      detectedIntent: "other",
    });
  }
  const { object } = await generateObject({
    model,
    schema: draftSchema,
    system: `${loadPrompt("draft.md")}\n${languageInstruction(typeof payload.language === "string" ? payload.language : "auto")}`,
    prompt: JSON.stringify(payload),
  });
  return object;
}

function looksTurkish(text: string) {
  return /[çğıöşüÇĞİÖŞÜ]/.test(text);
}

function mockDraft(input: {
  tone: DraftTone;
  language: string;
  contactName: string | null;
  propertyTitle: string | null;
  bookingUrl: string | null;
  lastIn: string;
}) {
  const viewingIntent =
    /viewing|visit|see the (flat|apartment|property)|gösterim|gezmek/i.test(
      input.lastIn,
    );
  const tr =
    input.language === "tr" ||
    (input.language === "auto" && looksTurkish(input.lastIn));
  const name = input.contactName ?? (tr ? "merhaba" : "there");
  const property =
    input.propertyTitle ?? (tr ? "portföydeki ilan" : "the property");
  const opener = tr
    ? input.tone === "formal"
      ? `Sayın ${input.contactName ?? "ilgili"},`
      : input.tone === "short"
        ? `${input.contactName ?? "Merhaba"},`
        : `Merhaba${input.contactName ? ` ${input.contactName}` : ""},`
    : input.tone === "formal"
      ? `Dear ${name},`
      : input.tone === "short"
        ? `${input.contactName ?? "Hi"},`
        : `Hi ${name},`;
  const middle = viewingIntent
    ? tr
      ? `${property} için bir gösterim ayarlamaktan memnuniyet duyarım.`
      : `Happy to arrange a viewing for ${property}.`
    : tr
      ? `${property} hakkındaki notunuz için teşekkürler.`
      : `Thanks for your note about ${property}.`;
  const link =
    viewingIntent && input.bookingUrl
      ? tr
        ? ` Uygun bir saat seçmek için: ${input.bookingUrl}`
        : ` You can pick a time here: ${input.bookingUrl}`
      : "";
  const close = tr
    ? input.tone === "short"
      ? "İyi günler,"
      : "Sonraki adımda yardımcı olmaktan memnuniyet duyarım."
    : input.tone === "short"
      ? "Best,"
      : "Happy to help with the next step.";
  return {
    body: `${opener}\n\n${middle}${link}\n\n${close}`,
    detectedIntent: viewingIntent
      ? ("viewing_request" as const)
      : ("other" as const),
  };
}
