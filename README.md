# Havn

AI-native property management platform for real estate agents. Rental-focused workflow in one workspace: portfolio, multi-party viewing scheduling, applicant pipeline, unified inbox, AI contract mode.

## Docs (single source of truth)

| # | Doc | Scope |
|---|---|---|
| 00 | [PRD](docs/00-prd.md) | Vision, personas, core flows, navigation, v1 scope |
| 01 | [Design System](docs/01-design-system.md) | Tokens, typography, shadcn patches, icons, layout |
| 02 | [Architecture](docs/02-architecture.md) | Stack, folder structure, permissions, environments, quality gates |
| 03 | [Database Schema](docs/03-database-schema.md) | Postgres / Supabase / Drizzle schema, RLS notes |
| 04 | [Slot Engine](docs/04-slot-engine.md) | Multi-party availability intersection, materialization, public booking flow, mandatory tests |
| 05 | [AI Features](docs/05-ai-features.md) | Home ask (RAG + tools), Draft with AI, reminders, contract mode, embeddings pipeline |
| 06 | [Roadmap](docs/06-roadmap.md) | Phase-by-phase build plan (Phase 0–8) with definition of done |
| 07 | [Cursor Rules](docs/07-cursor-rules.md) | Source of `.cursor/rules/*.mdc` |

Read the relevant doc before starting a feature. Code must not contradict the docs; update the doc first if needed.

Language: everything is English — code, docs and all user-facing copy. UI strings live in `messages/en.json` (next-intl, single locale, no URL prefix).

## Development

```bash
nvm use            # Node 22 (.nvmrc)
npm install
cp .env.example .env.local
npm run supabase:start   # local Postgres via Docker
npm run db:migrate
npm run dev
```

Quality gates: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`.

### Local auth & email

- Sign-in is magic link only. Locally, Supabase delivers auth emails to **Mailpit** at http://127.0.0.1:54324 — open the latest message and follow the link.
- App emails (invites, later booking confirmations) use Resend when `RESEND_API_KEY` is set; otherwise they are sent to the same Mailpit over SMTP (`SMTP_PORT=54325`).
- First sign-in lands on `/onboarding` to create a workspace; invited users land on `/invite/[token]`.

### Data access rules

- `db` (system context) is for bootstrap flows, webhooks and jobs; every request-scoped query runs through `withUserContext(userId, tx => …)` so Postgres RLS applies.
- Every mutation calls `requireAbility()` (`lib/permissions.ts`) and writes to `activity_log` (`lib/activity.ts`).
- `lib/db/rls.test.ts` exercises the policies against the local database; it self-skips without `DATABASE_URL`.
