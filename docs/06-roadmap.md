# 06 — Cursor Build Roadmap (Phase by Phase, Step by Step)

> **How to use:** Each phase = a separate Cursor chat (new chat). What to add to context is listed at the start of each phase. Do not move to the next phase before the current one is done. At the end of each phase tick the "definition of done" checklist and commit.

## Preparation (once)

1. Put the 00–07 md files under `docs/` (these files).
2. Set up `.cursor/rules/` (split the content of 07-cursor-rules.md into the file names listed there).
3. First-message template for every new Cursor chat:
   > "We are building this project according to the vision in docs/00-prd.md. Design language: docs/01-design-system.md. We will now implement PHASE X from docs/06-roadmap.md. Related spec: docs/0Y-….md. Produce a plan first, wait for my approval, then code."

---

## PHASE 0 — Scaffold & Design Tokens (0.5 day)
**Context:** 01, 02, 07
- create-next-app + shadcn init + component add list (01-design-system.md §4)
- globals.css token set (light+dark), Inter + Newsreader `next/font` setup, Tailwind v4 theme binding
- Hugeicons setup + `components/icons.tsx`
- ui/ patches (button soft/xs/pill variants, card/input shadow-none, badge soft variants)
- `prompt-bar`, `page-header`, `empty-state`, `event-chip` skeletons
- AppShell: sidebar + content layout with 5 nav items (Home, Inbox, Calendar, Properties, Settings — content stubbed)
**DoD:** `npm run dev` runs; sidebar + sample page render with the Granola tokens; tsc+eslint green.

## PHASE 1 — Auth & Workspace (1 day)
**Context:** 02, 03 (§1)
- Supabase setup (CLI local + project), Drizzle schema: profiles, workspaces, workspace_members, invites
- Auth: email magic link (Supabase), callback route, (app) protection via middleware
- Onboarding: first login → workspace creation flow (name, timezone)
- Settings > Members: teammate invite (invite token + accept flow)
- `lib/permissions.ts` + activity_log helper
**DoD:** signup → workspace → second user accepts an invite end to end; unauthorized routes redirect.

## PHASE 2 — Properties CRUD + Detail (2 days)
**Context:** 00 (§3.1), 01, 03 (§2–3)
- Schema: properties, property_media, inventory_items, documents, property_people, contacts, activity_log
- Properties list: grid/list toggle, status badges, search, type filter
- Create/edit: a single (non-wizard) form (type, title, address, price, details) + photo upload (Supabase Storage, drag-drop, ordering)
- Detail page tabs: Overview / Inventory / People / Files / Viewings(stub) / Applications(stub) / Activity
- People tab: add contact (owner/tenant), generate invite link (copy only for now — magic link in PHASE 3)
- Files: upload/list/download; Activity: append-only log view
**DoD:** A property can be created and edited across all tabs; changes land in the audit log; RLS tests (another workspace cannot see it).

## PHASE 3 — Calendar & Slot Engine + Public Booking (3 days) ★
**Context:** 04, 03 (§4), 00 (§3.2)
- `lib/slots/` fully test-first: write the test scenarios from 04 first, then implement (TDD is mandatory in this phase)
- Schema: viewing_calendars, availability_windows (+exceptions), viewing_slots, bookings
- UI — Viewings tab: publish calendar, slot settings, agent window editor (weekly grid), tenant invite (magic link + 3-step "enter your availability" wizard)
- Inngest: materialize-slots + nightly cron
- Public `/b/[token]`: day list + slot chips + OTP + confirmation + .ics + cancel (in the Granola language: serif heading, single column, hairline)
- Agent calendar page: bookings across all properties (a list view is enough; month view in phase 7)
**DoD:** End to end: agent enters windows → tenant enters windows via link → intersection slots on the public link → OTP booking → confirmation email to both sides → cancel. Slot engine test coverage ≥90%.

## PHASE 4 — Forms & Pipeline + Owner Presentation (2 days)
**Context:** 00 (§3.3), 03 (§5), 01
- Schema: forms, form_submissions, pipeline_stages, applications, owner_views
- Form builder: field list + property panel (in-page, not a modal); public `/f/[token]`
- Attach a form to booking (`require_form_first`)
- Pipeline page: kanban (dnd-kit), add/rename stages, card = applicant summary
- Applicant detail (sheet): answers, attachments, history, AI summary field (filled in PHASE 6)
- Owner presentation `/o/[token]`: read-only, shortlist comparison cards + approve/request-changes button → notification to the agent
**DoD:** An applicant who fills the form lands in the pipeline; the owner approval flow works via the link.

## PHASE 5 — Inbox: Gmail + Resend (2 days)
**Context:** 02, 03 (§6), 05 (§3 partially)
- Settings > Integrations: Gmail OAuth connect/disconnect, status badge
- Inngest inbox-sync: delta fetch via the history API, webhook (Pub/Sub) in prod
- Resend outbound + react-email templates (invite, booking confirmation, reminder)
- Inbox UI: conversation list (left) + thread (right), property/contact auto-link (phone/email match), unread badge
- Reply composer (without AI for now)
**DoD:** Connect Gmail → inbound message arrives → linked to the property → reply is sent from the inbox. (WhatsApp is a stub in this phase; PHASE 7.)

## PHASE 6 — AI Core: Ask + Draft + Summaries (2.5 days)
**Context:** 05, 01 (prompt-bar)
- Embeddings pipeline + tool set (6 tools) + Home ask screen (streaming, source cards)
- Draft with AI (inline in the conversation) + tone picker
- Applicant auto-summary + score
- Settings > AI: signature, language, tone defaults, quota indicator
- ai_threads history listed on Home
**DoD:** "How many viewings this month?" counts correctly; drafts are generated and the send metric is recorded; a summary appears on new applications.

## PHASE 7 — Contract Mode + WhatsApp + Reminders + Calendar Month View (2.5 days)
**Context:** 05 (§4–5), 00 (§3.5)
- Templates settings, contract wizard, markdown editor + versions, DOCX/PDF export, disclaimer flow
- WhatsApp Cloud API: template sending, inbound webhook, merging into conversations
- Proactive reminders cron + Home "Needs attention"
- Calendar month/week view (property filter), with event chips
**DoD:** A contract draft is generated and exported; a WhatsApp message shows up in the inbox; reminder cards flow in.

## PHASE 8 — Polish & Hardening (1.5 days)
- Playwright smoke suite, RLS audit, rate limits, error boundaries, empty states
- Dark mode review, mobile responsive pass, PWA manifest
- Seed script (demo workspace: 4 properties, bookings, conversations) — for demos/sales
- Performance: public page Lighthouse 95+, N+1 scan (drizzle query log)

---

## Tactics for Working with Cursor

- **Split big phases**: Don't say "do PHASE 3" in one prompt; use 30–60 minute slices like "PHASE 3, step 2: write the slot engine with TDD".
- **Plan approval first**: In every slice ask Cursor for the list of files to change + the approach before coding; don't let it code before approval.
- **Schema change protocol**: Generate a Drizzle migration → review the diff → apply. The rule "never edit an existing migration, generate a new one" lives in the rules.
- **Regression alarm**: Every prompt touching the slot engine must "run the tests and show the result".
- **Context hygiene**: When a chat gets long, open a new one; carry a 2–3 bullet summary of "what is done" into the new chat.
- **UI work**: End every UI prompt with: "Don't violate the golden rules in docs/01-design-system.md §9; run a violation check when done."
