import { generateText } from "ai";

import { isTextConfigured, textModel } from "@/lib/ai/models";
import { loadPrompt } from "@/lib/ai/prompts";
import type { ReminderSignal } from "@/lib/reminders/signals";

export function mockReminderCopy(signal: ReminderSignal) {
  const person = signal.context.contactName;
  const property = signal.context.propertyTitle;
  switch (signal.kind) {
    case "booking_soon":
      return person && property
        ? `Viewing with ${person} at ${property} starts in about 2 hours — send the reminder.`
        : "A viewing starts in about 2 hours — notify everyone.";
    case "viewing_followup":
      return person && property
        ? `Follow up with ${person} about ${property} — no word since yesterday's viewing.`
        : "Follow up after yesterday's viewing.";
    case "unanswered_message":
      return person
        ? `${person} has been waiting 7 days for a reply.`
        : "An inbound message has been unanswered for 7 days.";
    case "stale_applicant":
      return person && property
        ? `${person} has sat in the same pipeline stage for ${property} for 5+ days.`
        : "An applicant has sat in the same pipeline stage for 5+ days.";
    case "missing_deposit":
      return property
        ? `${property} is marked rented but the deposit field is empty.`
        : "A rented property is missing its deposit amount.";
  }
}

export async function reminderCopy(signal: ReminderSignal) {
  if (!isTextConfigured()) return mockReminderCopy(signal);
  const model = textModel("haiku");
  if (!model) return mockReminderCopy(signal);
  const { text } = await generateText({
    model,
    system: loadPrompt("reminder-copy.md"),
    prompt: JSON.stringify(signal),
  });
  return text.trim() || mockReminderCopy(signal);
}
