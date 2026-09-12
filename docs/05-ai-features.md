# 05 — AI Features Spec

> Stack: Vercel AI SDK (`streamText`, `generateObject`), Anthropic (text quality is critical: draft + contract), OpenAI embeddings + pgvector (RAG). All AI calls live under `lib/ai/`; prompts are versioned as `lib/ai/prompts/*.md` — NO prompts embedded in code.

## 1. In-Product AI Surfaces

| Surface | Trigger | Model task | Output |
|---|---|---|---|
| Home prompt bar | User question | Portfolio answer via RAG + tools | Streaming text + source cards (deep links) |
| Inbox "Draft with AI" | Button (in a conversation) | Draft from thread summary + context | Inline editable draft (EN/TR, 3 tones: formal / friendly / short) |
| Smart reminders | Inngest cron (every 2 hours) | Signal scan → proactive suggestion | Home feed card + email digest |
| Contract mode | "Create contract" | Contract draft from template + parameters | Markdown in the editor → DOCX/PDF |
| Applicant summary | On form submission | Applicant summary + risk note + 1–5 score suggestion | application.ai_summary + score |
| Conversation auto-link | Inbound message | Match the message to contact + property | conversation.property_id |

## 2. Home Ask — Architecture

1. Question → `hybrid retrieval`: (a) structured tool calls (tool set below), (b) pgvector semantic search (`embeddings` table, cosine distance < 0.25 threshold, workspace filter mandatory).
2. Tool set (AI SDK `tools`, each a server-side zod-schema'd function):
   - `searchProperties(query, filters)` — title/address/status/price
   - `getPropertyDetail(id)` — inventory, people, docs meta
   - `listViewings(propertyId?, from, to, status)` — calendar queries
   - `listApplications(propertyId, stage?)` — pipeline questions
   - `searchConversations(query, propertyId?)` — inbox search (over summaries)
   - `getReminders(status)`
3. System prompt principles: answer only from workspace data; say so when you don't know; attach the source as a card when quoting numbers; respond in the workspace language (English by default).
4. Answer UI: streaming text + source chips underneath (property/conversation deep links). The conversation is saved to `ai_threads`.
5. **Guardrail**: the AI never creates/deletes/cancels bookings — read-only + suggestions. Write operations (later: "book this slot") arrive via an approved tool-call flow; disabled in v1.

## 3. Draft with AI — Inbox

- Context bundle: last 12 messages + conversation.ai_summary + property summary + contact name + the agent's signature block (Settings > AI).
- Prompt output via `generateObject`: `{ body, detectedIntent, suggestedFollowUpDate? }` — when the intent is "viewing_request" the booking link is injected into the draft automatically.
- Usage metric: similarity between the sent draft and the AI output (diff ratio) is computed when `ai_drafts.status='sent'` is set → acceptance-rate metric.

## 4. Smart Reminders (proactive)

Signals (all deterministic pre-filters; the AI only writes the copy):
- 24 hours since a viewing, no word from the prospect → follow-up suggestion + ready draft
- Reminder to all parties 2 hours before a booking (deterministic; sent even without AI)
- Inbound message unanswered for 7 days
- Applicant sitting in the same pipeline stage for 5+ days
- Deposit field empty on a `rented` property → data completion suggestion
- Output: written to the `reminders` table, shown in the Home "Needs attention" section + daily email digest (can be turned off).

## 5. Contract Mode

1. Input: template (Settings > Templates, markdown + `{{variable}}`), property, application (parties), parameter form (rent, deposit, start/end, increase rate, special clauses).
2. Two-stage generation: (a) `generateObject` resolves all `{{variables}}` and reports missing/conflicting fields; (b) `streamText` produces the final contract draft as markdown.
3. Editor: markdown editor (a simple textarea + preview is enough), versioning in the contracts table.
4. Export: DOCX (docx npm) + PDF (pdfmake, no Playwright). Saved to the Files tab.
5. Mandatory UI: a disclaimer card on every generation — "This draft is not legal advice; have it reviewed by a lawyer before use." + the export button stays disabled until the `disclaimer_acknowledged` checkbox is ticked.
6. FREE scope in v1: Turkish-market rental agreement + deposit receipt + eviction undertaking templates (seed data; placeholder content, the agent can upload their own template).

## 6. Embedding Pipeline (Inngest)

- Triggers: property create/update, document text extraction (v1: only manual notes + AI summaries; OCR deferred), conversation.ai_summary update, form submission.
- Chunk strategy: property → 1 chunk (structured summary text); conversation summary → 1 chunk; document → 500 tokens with overlap.
- Deletion: embeddings cascade when the entity is deleted.

## 7. Cost & Limits

- Plan-based quota: Free 100 AI messages/month, Pro 2000 (tracked by counting ai_messages).
- Model routing: short classification (auto-link, intent) → haiku class; draft/contract/ask → sonnet class. Provider config in a single file (`lib/ai/models.ts`). When no API key is configured, a deterministic mock model is used and the UI shows an "AI not configured" badge.

## 8. Prompt Files (to be created in the repo)

```
lib/ai/prompts/ask-system.md        # tool usage rules, mandatory source citation
lib/ai/prompts/draft.md             # tone matrix, signature, booking-link injection
lib/ai/prompts/contract-system.md   # variable resolution, disclaimer, legal terminology
lib/ai/prompts/applicant-summary.md # score rubric (ability to pay, timing, references, fit)
lib/ai/prompts/reminder-copy.md     # short, actionable single sentence + CTA
```
