# 07 — Cursor Rules Setup Guide

> The content of this file is split into `.cursor/rules/` under the file names below.
> Cursor loads these rules automatically in every chat (alwaysApply) or by file pattern (globs).

---

## FILE: `.cursor/rules/project.mdc`

```markdown
---
description: Project context — always apply
alwaysApply: true
---

This repo is "Temas": an AI-native property management platform for real estate agents.
Single sources of truth:
- docs/00-prd.md (product), docs/01-design-system.md (UI), docs/02-architecture.md (stack & structure),
- docs/03-database-schema.md (DB), docs/04-slot-engine.md (calendar logic), docs/05-ai-features.md (AI).

Rules:
- Read the relevant docs md before starting a feature; never write code that contradicts the docs. If needed, propose a docs update first.
- Stay inside the stack: Next.js App Router, TypeScript strict, Tailwind v4, shadcn/ui (patched), Drizzle, Supabase, Inngest, Vercel AI SDK.
- Server state: NO React Query — Server Components + Server Actions. Client state: useState/zustand only when needed.
- Every mutation is validated with zod inside a Server Action; the `requireAbility()` permission check is never skipped.
- Everything is in English: code, comments, docs and all user-facing text. UI strings go through i18n message keys (`messages/en.json`); no hard-coded copy in components.
- Migrations are never edited; a schema change = a new drizzle migration.
```

---

## FILE: `.cursor/rules/ui.mdc`

```markdown
---
description: UI/style rules — apply in component and page files
globs: ["components/**", "app/**"]
alwaysApply: false
---

Design language: docs/01-design-system.md (Granola benchmark). Golden rules:
1. shadow-lg/md forbidden; separate with hairline borders (`border`). The only allowed shadow: the 1px subtle shadow on the prompt bar.
2. Emoji forbidden — always Hugeicons through the `components/icons.tsx` re-export. No direct @hugeicons imports.
3. Page titles serif: `font-serif` (Newsreader). UI text Inter. tracking-tight on headings.
4. One primary button per screen; the others variant="soft" | "ghost" | "outline". Top-right actions are pills.
5. Colours only from CSS tokens (bg-secondary, text-muted-foreground, bg-brand-soft etc.). Hex literals forbidden.
6. Empty states <EmptyState>; loading <Skeleton>; toasts sonner soft variant.
7. Radius: tokens (card 10px, dialog 16px, pill full). No arbitrary rounded-md/lg.
8. List/row separation divide-y; card padding p-4/p-5; section spacing space-y-6/8.
9. Before creating a new UI component, check components/ui for an equivalent; extend it instead of forking.
10. Responsive: sidebar sheet on mobile; tables wrap in horizontal scroll; touch targets ≥40px.
```

---

## FILE: `.cursor/rules/slots.mdc`

```markdown
---
description: Slot engine rules — apply in lib/slots and calendar code
globs: ["lib/slots/**", "inngest/**", "app/(public)/b/**"]
alwaysApply: false
---

- lib/slots contains pure functions: DB imports, fetch and direct Date.now() calls are FORBIDDEN (now arrives as a parameter).
- Time: always store/compute in UTC; timezone conversion only at the boundary (expandRRule output and rendering).
- Half-open interval convention: [start, end). A 17:00 end does not cover a 17:00 start.
- Changes are TDD: first a test from docs/04-slot-engine.md §5 scenarios, then the implementation.
- Materialization must be idempotent: the same input twice → the same diff (empty second diff).
- booked/blocked slots are never deleted; if a window shrinks → 'blocked' + a warning to the agent.
- At the end of every task touching this folder: run `npm run test -- lib/slots` and report the result.
```

---

## FILE: `.cursor/rules/ai.mdc`

```markdown
---
description: AI layer rules
globs: ["lib/ai/**", "app/api/ai/**"]
alwaysApply: false
---

- Prompts are not embedded in code; they are loaded from lib/ai/prompts/*.md.
- The AI performs no writes (v1): the tool set is read-only. Draft/contract outputs are never sent/exported without human approval.
- Every AI call: the workspace scope filter is mandatory (in the application layer in addition to RLS).
- Where structured output is needed use generateObject + zod; free text uses streamText.
- Model selection only through lib/ai/models.ts; model names are never hard-coded in endpoints.
- In the contract flow the export button stays disabled while disclaimer_acknowledged=false — in the UI and on the server.
```

---

## FILE: `.cursor/rules/db.mdc`

```markdown
---
description: Database rules
globs: ["lib/db/**", "drizzle/**"]
alwaysApply: false
---

- docs/03-database-schema.md is the single source; when adding a table write it there first, then in the schema.
- RLS is mandatory on every new table; public token access via SECURITY DEFINER functions, broad anon policies forbidden.
- Queries go through Drizzle; raw SQL only for pgvector/RPC.
- No N+1: joins/CTEs in list queries; pagination is cursor based (keyset).
- Soft delete: set deleted_at; filter by default in queries. activity_log is never updated/deleted.
```

---

## Setup Steps (summary)

1. Create the 5 files above under `.cursor/rules/`.
2. Verify in Cursor Settings → Rules that the files are recognized.
3. First chat: "Confirm the rules/project.mdc rules and start PHASE 0 of docs/06-roadmap.md" — test here that the rules are loaded (Cursor's answer should reference the tokens/rules).
4. When rules change: say "re-read the rules" in the chat before opening a new one.
