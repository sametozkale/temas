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
| WhatsApp | **WhatsApp Business Cloud API** (Meta) — template messages + inbound webhook | |
| Form infrastructure | react-hook-form + zod (builder schema stored as JSON in the DB) | |
| Date/time | `date-fns` + `rrule`; **all times stored in UTC**, rendered in the property's timezone | Mandatory |
| Testing | Vitest (unit: slot engine), Playwright (critical flows) | |
| Deploy | Vercel + Supabase (region: eu-central — balanced latency for Tallinn/TR) | |

## 2. Not a Monorepo — One Next App, Clear Folder Structure

```
app/
  (auth)/login, /auth/callback, /auth/verify
  (app)/                       # protected workspace area
    home/  inbox/  calendar/  properties/
    properties/[id]/ (overview|inventory|people|files|viewings|applications|activity)
    pipeline/[propertyId]/
    settings/(general|members|integrations|notifications|ai|templates|billing)
  (public)/
    b/[token]/                 # public booking page
    f/[token]/                 # public form
    o/[token]/                 # owner pipeline presentation (read-only)
  api/
    webhooks/(gmail|whatsapp|resend)/route.ts
    ai/(chat|draft|contract)/route.ts
    cron/  (inngest serve: api/inngest/route.ts)
components/
  ui/          # shadcn (patched — edited by hand)
  icons.tsx    # central Hugeicons re-export
  prompt-bar.tsx  event-chip.tsx  page-header.tsx  empty-state.tsx
  properties/  inbox/  calendar/  pipeline/  forms/  ai/
lib/
  db/          # drizzle client + schema/ (one file per table group)
  slots/       # ★ slot engine (pure functions, no IO — testable)
  ai/          # prompts/, tools/, rag.ts, drafts.ts, contract.ts
  integrations/(gmail|outlook|whatsapp|resend)/
  auth.ts  permissions.ts  rate-limit.ts
inngest/       # functions: materialize-slots, reminders, inbox-sync, embed-*
emails/        # react-email templates (invite, booking confirmation, reminder)
docs/          # ← these md files live here in the repo
.cursor/rules/ # ← the content of 07-cursor-rules.md is filed here
```

## 3. Authorization Model

- Source: `workspace_members.role` + `property_people` (owner/tenant links), see 03.
- A single server-side gate: `lib/permissions.ts → requireAbility(membership, action, resource)`.
- RLS policies mirror the same matrix in the DB (defense-in-depth); public routes (`b/`, `f/`, `o/`) are **token based** and never use the RLS-bypassing service role — public tables get their own policies / SECURITY DEFINER functions.
- Application queries run inside `withUserContext(userId, tx => …)` so Postgres evaluates them as the `authenticated` role; the system-context client is reserved for bootstrap flows (onboarding, invite acceptance), webhooks and Inngest jobs.

## 4. Environments & Variables

`.env.example` is mandatory: `DATABASE_URL`, `SUPABASE_*`, `RESEND_API_KEY`, `GOOGLE_CLIENT_*`, `META_WHATSAPP_*`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `INNGEST_*`, `APP_URL`.
Three environments: local (Supabase CLI local Postgres), preview (Vercel), prod.
Missing integration keys never crash the app: `lib/env.ts` exposes `isConfigured` flags and the feature falls back to a dev mode (Mailpit for email, Inngest dev server, mock AI model).

## 5. Quality Gates (every PR)

- `tsc --noEmit`, `eslint`, `prettier --check`
- No merge without green slot engine unit tests
- Playwright smoke: signup → property → availability → public booking
- Lighthouse: 95+ performance target on public pages (b/, f/) (no SEO, but speed is essential — links will be opened from WhatsApp)

## 6. Deliberate Deferrals

- e-signature: out of v1 (export + status tracking is enough)
- Outlook sync: the phase after Gmail
- Mobile: responsive + PWA manifest; no native app
- i18n: `next-intl` infrastructure is set up; v1 ships the `en` locale only (no URL prefix). Every user-facing string goes through message keys so additional locales can be added without code changes.
