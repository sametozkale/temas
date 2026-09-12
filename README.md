# Havn

AI-native property management platform for real estate agents. Rental-focused workflow in one workspace: portfolio, multi-party viewing scheduling, applicant pipeline, unified inbox, AI contract mode.

## Docs (single source of truth)

| # | Doc | Scope |
|---|---|---|
| 00 | [PRD](docs/00-prd.md) | Vision, personas, core flows, navigation, v1 scope |
| 01 | [Design System](docs/01-design-system.md) | Tokens, typography, shadcn patches, icons, layout |
| 02 | [Architecture](docs/02-architecture.md) | Stack, folder structure, permissions, environments, quality gates |
| 03 | [Database Schema](docs/03-database-schema.md) | Postgres / Supabase / Drizzle schema, RLS notes |
| 04 | Slot Engine | _pending_ |
| 05 | AI Features | _pending_ |
| 06 | Roadmap | _pending_ |
| 07 | [Cursor Rules](docs/07-cursor-rules.md) | Source of `.cursor/rules/*.mdc` |

Read the relevant doc before starting a feature. Code must not contradict the docs; update the doc first if needed.

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
