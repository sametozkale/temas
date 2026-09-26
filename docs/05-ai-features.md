# 05 — AI Features Spec

> Stack: Vercel AI SDK (`streamText`, `generateObject`), Anthropic (text quality is critical: draft + contract), OpenAI embeddings + pgvector (RAG). All AI calls live under `lib/ai/`; prompts are versioned as `lib/ai/prompts/*.md` — NO prompts embedded in code.

## 1. In-Product AI Surfaces

| Surface | Trigger | Model task | Output |
|---|---|---|---|
| Home prompt bar | User question + optional files | Portfolio answer via RAG + tools | Streaming text with inline entity chips + source chips |
| Home thread title | First question on a new thread | Short chat name (haiku) | `ai_threads.title` + `data-thread` |
| Inbox "Draft with AI" | Button (in a conversation) | Draft from thread summary + context | Inline editable draft (EN/TR, 3 tones: formal / friendly / short) |
| Smart reminders | Inngest cron (every 2 hours) | Signal scan → proactive suggestion | Home feed card + digest |
| Contract mode | "Create contract" | Contract draft from template + parameters | Markdown in the editor → DOCX/PDF |
| Applicant summary | On form submission | Applicant summary + risk note + 1–5 score suggestion | application.ai_summary + score |
| Conversation auto-link | Inbound message | Match the message to contact + property | conversation.property_id |
| Inbox task extract | Inbound or outbound Gmail/WhatsApp (Inngest) | Extract open actions; mark finished ones done | Private `suggested` rows; auto-`done` when the thread shows completion |

## 2. Home Ask — Architecture

1. Question (+ optional image/PDF/doc attachments from the composer) → `hybrid retrieval`: (a) structured tool calls (tool set below), (b) pgvector semantic search (`embeddings` table, cosine distance < 0.25 threshold, workspace filter mandatory). Attachments travel as AI SDK `FileUIPart`s on the live turn (not stored in `ai_messages` in v1).
2. Tool set (AI SDK `tools`, each a server-side zod-schema'd function):
   - `searchProperties(query, filters)` — title/address/status/price
   - `getPropertyDetail(id)` — inventory, people, docs meta
   - `listViewings(propertyId?, from, to, status)` — calendar queries
   - `listApplications(propertyId, stage?)` — pipeline questions
   - `searchConversations(query, propertyId?)` — **the caller’s** inbox only (over summaries)
   - `getReminders(status)` — unanswered-message cards only for the caller’s mailbox; other kinds stay workspace-wide
3. System prompt principles: answer only from workspace data the caller may see; never quote another agent’s inbox; say so when you don't know; cite a record as `[Name](/relative-path)` from the tool `href` (never an absolute URL); respond in the agent’s language preference (Settings > AI: **Match the prompt** by default — same language as the question or thread — or a pinned language).
4. Answer UI: streaming text. Properties, people, conversations and other workspace records in the **user prompt and the answer** render as inline clickable chips (name + type icon), not markdown links or raw URLs. The chip label is the record’s **current** name: a rename updates older threads. The saved wording stays in the message and still matches the chip. Source chips sit under the answer for citations that were not already inlined. The conversation is saved to `ai_threads`. On the first turn, haiku names the thread (`generateObject`, `name-thread.md`); the title streams as `data-thread` and appears top-left. Until then the header stays empty and the sidebar shows “New chat”. The header more menu can **rename** (max 60 chars) or **delete** the caller’s own thread (`requireAbility('ai.use')`; messages cascade).
5. **Guardrail**: the AI never creates/deletes/cancels bookings — read-only + suggestions. Write operations (later: "book this slot") arrive via an approved tool-call flow; disabled in v1.

## 3. Draft with AI — Inbox

- Context bundle: last 12 messages + conversation.ai_summary + property summary + contact name + the agent's signature block (Settings > Profile).
- Language follows Settings > AI (**Match the prompt** writes in the latest inbound language; a pinned language is always used).
- Prompt output via `generateObject`: `{ body, detectedIntent, suggestedFollowUpDate? }` — when the intent is "viewing_request" the booking link is injected into the draft automatically.
- Usage metric: similarity between the sent draft and the AI output (diff ratio) is computed when `ai_drafts.status='sent'` is set → acceptance-rate metric.

## 4. Smart Reminders (proactive)

Signals (all deterministic pre-filters; the AI only writes the copy):
- 24 hours since a viewing, no word from the prospect → follow-up suggestion + ready draft
- Reminder to all parties 2 hours before a booking (deterministic; sent even without AI)
- Inbound message unanswered for 7 days (written with `reminders.user_id` = mailbox owner; Home/Ask hide these from everyone else)
- Applicant sitting in the same pipeline stage for 5+ days
- Deposit field empty on a `rented` property → data completion suggestion
- Output: written to the `reminders` table, shown in the Home "Needs attention" section + daily digest (email and/or WhatsApp from Settings > Notifications).

## 5. Contract Mode

1. Input: template (Settings > Templates, markdown + `{{variable}}`), property, application (parties), parameter form (rent, deposit, start/end, increase rate, special clauses). Placeholders fill from the listing: owner/tenant (People), address and layout, rent/deposit/dues/currency, inventory, workspace **official company name** (falls back to the team-facing workspace name) as `{{agency_name}}`, assigned agent, and the property country as `{{jurisdiction}}`.
2. Two-stage generation: (a) `generateObject` resolves all `{{variables}}` and reports missing/conflicting fields; (b) `streamText` produces the final contract draft as markdown.
3. Editor: the draft opens as the document (headings, paragraphs, lists). Edit reveals the markdown textarea. An unfilled `{{variable}}` reads as a quiet chip, not raw braces. Versions stay in the contracts table.
4. Export: DOCX (docx npm) + PDF (pdfmake, no Playwright). Saved to the Files tab.
5. Mandatory UI: a disclaimer card on every generation — "This draft is not legal advice; have it reviewed by a lawyer before use." + the export button stays disabled until the `disclaimer_acknowledged` checkbox is ticked.
6. Starter pack (seeded per workspace; insert-missing-by-name, and replace a matching starter only when it still has no `{{jurisdiction}}` so old stubs upgrade without clobbering lawyer-edited copy): **Listing mandate**, **Reservation offer**, **Residential rental agreement**, **Deposit receipt**, **Handover protocol**, **Eviction undertaking**. Each includes a jurisdiction clause. Country-specific deposit caps, tenancy registration, rent-increase indices, cooling-off, notice periods, deposit-protection schemes and required annexes stay outside the product — the agent edits the markdown and a local lawyer reviews it. Custom templates can be added; Restore starter puts the product copy back.

## 6. Embedding Pipeline (Inngest)

- Triggers: property create/update, document text extraction (v1: only manual notes + AI summaries; OCR deferred), conversation.ai_summary update, form submission.
- Chunk strategy: property → 1 chunk (structured summary text); conversation summary → 1 chunk; document → 500 tokens with overlap.
- Deletion: embeddings cascade when the entity is deleted.

## 7. Cost & Limits

- Plan-based quota is **per workspace** (`workspaces.plan` + `workspaces.billing_interval` + `lib/plans.ts`). The month's spend is the sum of `ai_messages.credits` in that workspace. **Solo**: 500 credits/month, or 750/month when billed annually. **Team**: 750 credits/month, or 1,000/month when billed annually. An account on several workspaces does not share one quota. Costs (`lib/ai/credits.ts`): Ask **1**, inbox draft **3**, applicant summary **2**, contract **8**. Thread title, task extract, auto-link, embeddings and reminder copy are **0**. Ask refuses when the next question would pass the allowance. Limits are not hard-enforced beyond AI in this phase. Settings > AI shows remaining credits, used / limit, a quiet meter, and the reset date.
- Model routing: short classification (auto-link, intent, inbox task extract, thread title) → haiku class; draft/contract/ask → sonnet class. Provider config in a single file (`lib/ai/models.ts`). When no API key is configured, a deterministic mock model is used and the UI shows an "AI not configured" badge.

## 7.1 Inbox task extract

- Trigger: after a successful inbound insert (`lib/inbox/ingest.ts`, `ingest-whatsapp.ts`) **or outbound reply** (`lib/inbox/send.ts`) enqueue `inbox/extract-tasks` (debounce on `conversationId`). Never block the webhook or send path on model latency when Inngest Cloud is configured.
- Context: last 12 messages, each labeled `agent` (outbound, the mailbox owner) or `contact` (inbound), plus contact name, property title, conversation subject, and existing suggested/open tasks for that thread (`fingerprint` + title). Workspace filter is mandatory.
- `generateObject` (haiku): `{ tasks: [{ title, description?, priority }], completed: [{ fingerprint?, title? }] }`. Priority is `low`, `medium`, `high`, or `urgent`. `tasks` are specific **still-open** obligations that belong to the mailbox owner: the contact asked them to do it, or they promised to. Empty when the only open work belongs to the contact or someone else (they will send the documents, check with a partner) — do not turn waiting on them into a follow-up. Also empty for chit-chat and for a generic follow-up that would fit every conversation. Example that stays: ask the owner about the blackout curtains the prospect requested, then update them. `completed` lists existing fingerprints/titles the thread now shows as finished (keys received, contract sent, “thanks / already done”) even if the agent never ticked the row.
- Persist new items as `tasks` with `source=ai`, `status=suggested`, `user_id` = mailbox owner, `assignee_id` = mailbox owner, `property_id` from the conversation when linked, `fingerprint` = normalised title. Skip duplicates on `(conversation_id, fingerprint)`.
- Auto-complete: for `completed` fingerprints that match a **suggested** or **open** row on that conversation, set `status=done` and clear `user_id` (same end state as accept + tick). Do not reopen dismissed or already-done rows. Do not invent fingerprints.
- New suggestions still need the mailbox owner to accept or dismiss on `/tasks`. Completion on the thread does not require that tick.

## 8. Prompt Files (to be created in the repo)

```
lib/ai/prompts/ask-system.md        # tool usage rules, mandatory source citation
lib/ai/prompts/draft.md             # tone matrix, signature, booking-link injection
lib/ai/prompts/contract-system.md   # variable resolution, disclaimer, legal terminology
lib/ai/prompts/applicant-summary.md # score rubric (ability to pay, timing, references, fit)
lib/ai/prompts/reminder-copy.md     # short, actionable single sentence + CTA
lib/ai/prompts/extract-tasks.md     # open actions + completed fingerprints; empty when none
lib/ai/prompts/name-thread.md       # 3–6 word Ask chat title from the first question
```
