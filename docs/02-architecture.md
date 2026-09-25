# 02 — Architecture & Tech Stack

## 1. Stack Decisions

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 (App Router)**, TypeScript strict | Single-repo full-stack; RSC + Server Actions |
| UI | shadcn/ui (customized, see 01) + Tailwind v4 + Hugeicons + Inter/Newsreader | See the design language doc |
| DB / Auth / Storage | **Supabase** (Postgres + RLS + Storage + pgvector) | Magic-link invites, files and the RAG vector store in one place |
| ORM | **Drizzle** (`drizzle-orm` + `drizzle-kit`) | Type safe, we own the migrations |
| Server mutations | **Server Actions** (form submits) + route handlers (webhooks) | |
| AI | **Vercel AI SDK** + providers: Anthropic (draft/contract) + OpenAI embeddings (`text-embedding-3-small`, pgvector) | Streaming UI ready |
| Background jobs | **Inngest** (slot materialization, reminders, inbox sync, embeddings) | Cron + retry + fan-out built in |
| Email | Outbound: **Resend**. Inbound/sync: **Gmail API + Outlook Graph webhook** (v1: Gmail first) | |
| WhatsApp | **WhatsApp Business Cloud API** (Meta) — template messages + inbound webhook. Settings pairing is a generated QR (`/i/wa/[token]`) plus Linked-device style steps | |
| Form infrastructure | react-hook-form + zod (builder schema stored as JSON in the DB) | |
| Date/time | `date-fns` + `rrule`; **all times stored in UTC**, rendered in the property's timezone | Mandatory |
| Testing | Vitest (unit: slot engine), Playwright (critical flows) | |
| Deploy | Vercel + Supabase (region: eu-central — balanced latency for Tallinn/TR) | |

## 2. Not a Monorepo — One Next App, Clear Folder Structure

```
app/
  (auth)/login, /auth/callback, /auth/verify
  (app)/                       # protected workspace area
    home/  inbox/  calendar/  tasks/  properties/
    properties/[id]/ (overview|viewings|applications|people|files|inventory|activity|map)
    pipeline/[propertyId]/
    settings/(workspace|members|integrations|notifications|ai|templates|billing)  # /settings = profile + appearance
    settings/integrations/(gmail|whatsapp)  # setup (QR on WhatsApp) or connected + inbound simulator
  (public)/
    b/[token]/                 # public booking page
    i/wa/[token]/              # WhatsApp pairing confirm (QR scan, no session)
    f/[token]/                 # public form
    o/[token]/                 # owner pipeline presentation (read-only)
    api/
      webhooks/(gmail|whatsapp|resend)/route.ts
      geo/(countries|cities)/route.ts   # CountriesNow, 24h cache
      ai/(chat|draft|contract)/route.ts
    cron/  (inngest serve: api/inngest/route.ts)
components/
  ui/          # shadcn (patched — edited by hand)
  icons.tsx    # central Hugeicons re-export
  prompt-bar.tsx  event-chip.tsx  page-header.tsx  empty-state.tsx
  properties/  inbox/  calendar/  tasks/  pipeline/  forms/  ai/
lib/
  db/          # drizzle client + schema/ (one file per table group)
  slots/       # ★ slot engine (pure functions, no IO — testable)
  tasks/       # queries + zod for workspace tasks
  ai/          # prompts/, tools/, rag.ts, drafts.ts, contract.ts, extract-tasks.ts
  integrations/(gmail|outlook|whatsapp|resend)/
  auth.ts  permissions.ts  plans.ts  rate-limit.ts
  storage.ts  storage-constants.ts  storage-paths.ts
inngest/       # functions: materialize-slots, reminders, inbox-sync, extract-tasks, embed-*
emails/        # react-email templates (invite, booking confirmation, reminder, feedback)
supabase/
  templates/   # GoTrue Auth HTML (confirm, magic link, invite, recovery, email change) — same chrome as emails/_layout
docs/          # ← these md files live here in the repo
.cursor/rules/ # ← the content of 07-cursor-rules.md is filed here
```

## 3. Authorization Model

- Source: `workspace_members.role` + `property_people` (owner/tenant links), see 03.
- A single server-side gate: `lib/permissions.ts → requireAbility(membership, action, resource)`.
- Active workspace is the `temas_ws` cookie, resolved in `getAppContext()`. `switchWorkspace` **must verify membership** before writing the cookie, then redirect to `/home`.
- Listing assignment (`properties.assigned_user_id`) does **not** change RLS: any workspace member may read/write every property. Filters and notifications use the assignee.
- **Inbox is account-owned.** `integrations.user_id` + `unique(user_id, kind)`; `conversations.user_id` is the mailbox owner. RLS: the row is visible only to that user (and they must still be a member of the conversation’s workspace). Settings > Integrations lists the signed-in user’s Gmail/WhatsApp; switching workspace does not share the connection. Connecting Gmail imports the current INBOX (newest 50) before the redirect, and the first Inbox visit retries that import if it did not finish. Each imported thread also stores the mailbox owner’s own messages, so the conversation shows both sides. Opening a thread fills in any of those messages that are not stored yet. A new email is composed in the inbox and sent with the Gmail API; the sent message is the first outbound row of a new private conversation. Scrolling the list loads the next older page. Opening the inbox pulls new mail and Gmail star changes (the same pull runs on the five-minute poll). Archive, spam, trash, unread, and star on an open email call the Gmail API (`gmail.modify`) and then update `conversations.mailbox_state` / `starred`; the inbox list only shows `inbox`, ordered by the latest message in each thread. Importing an older message does not move that date backwards. Search filters that list by subject, sender name, and sender email.
- RLS policies mirror the same matrix in the DB (defense-in-depth); public routes (`b/`, `f/`, `o/`) are **token based** and never use the RLS-bypassing service role — public tables get their own policies / SECURITY DEFINER functions.
- Application queries run inside `withUserContext(userId, tx => …)` so Postgres evaluates them as the `authenticated` role; the system-context client is reserved for bootstrap flows (onboarding, extra workspace creation, invite acceptance), webhooks and Inngest jobs.

## 3.1 Plans & entitlements

- The commercial unit is the **workspace**. `workspaces.plan` is a catalog key (`free` | `pro`); limits live in `lib/plans.ts` (seats, properties, AI messages / month). AI quota already reads this catalog.
- One account on many workspaces does not share a plan: each workspace is billed (later) and gated independently.
- Settings > Billing is owner-only (`billing.manage`): selected catalog plan, this-cycle usage, payment method, invoices. Future Stripe: `stripe_customer_id` / `stripe_subscription_id` on **workspaces**, never on the user. Seat count = members + pending invites. Hard enforcement of seats/listings is deferred.

## 4. Environments & Variables

`.env.example` is mandatory: `DATABASE_URL`, `SUPABASE_*`, `RESEND_API_KEY`, `SEND_EMAIL_HOOK_SECRET`, `FEEDBACK_TO`, `GOOGLE_CLIENT_*`, `META_WHATSAPP_*`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `INNGEST_*`, `APP_URL`.
Three environments: local (Supabase CLI local Postgres), preview (Vercel), prod.
Missing integration keys never crash the app: `lib/env.ts` exposes `isConfigured` flags and the feature falls back to a dev mode (Mailpit for email, Inngest dev server, mock AI model). A `.local` `EMAIL_FROM` also stays on Mailpit even if a Resend key is present. `FEEDBACK_TO` is the product-feedback inbox for the sidebar dialog. Empty in development delivers to Mailpit (`feedback@localhost`); production must set it.

## 5. Quality Gates (every PR)

- `tsc --noEmit`, `eslint`, `prettier --check`
- No merge without green slot engine unit tests
- Playwright smoke: signup → property → availability → public booking
- Lighthouse: 95+ performance target on public pages (b/, f/) (no SEO, but speed is essential — links will be opened from WhatsApp)
- In-app navigations: `experimental.staleTimes.dynamic` is **30s** so the `(app)` layout (auth, chats, unread) is not refetched on every sidebar click. `loading.tsx` streams a quiet canvas skeleton that matches the destination chrome while that page resolves. Nested property-record `loading.tsx` only covers the tab body so the listing header does not flash.

## 6. Deliberate Deferrals

- e-signature: out of v1 (export + status tracking is enough)
- Outlook sync: the phase after Gmail
- Mobile: responsive + PWA manifest; no native app
- i18n: `next-intl` infrastructure is set up; v1 ships the `en` locale only (no URL prefix). Every user-facing string goes through message keys so additional locales can be added without code changes.
