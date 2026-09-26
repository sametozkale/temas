# PRD — AI-Native Property Management Platform for Real Estate Agents

> Product name: **Temas**. This file is the product's single source of truth. It is given to Cursor as context in every phase.

## 1. Vision

A platform that lets real estate agents run their entire rental-focused operation — portfolio management, viewing scheduling, applicant pipeline, communication and contracts — inside a single AI-native workspace.

**Primary ICP:** Independent agents and small agencies (1–10 people) with a rental-heavy portfolio.

**Differentiation thesis:** Existing property management software is a *system of record*. This product is a *system of action*: automatic booking from multi-party availability intersection, one-click AI communication drafts, an AI contract mode and natural-language querying across the whole portfolio.

## 2. Personas & Roles

A **workspace** is an office / agency. An **account** (login) may belong to many workspaces, each with its own role, plan, and data. Staff in a workspace see and manage the whole portfolio (**assignment is responsibility, not isolation**).

| Role | Definition | Access |
|---|---|---|
| Owner | Workspace administrator (often also a practising agent) | Everything, including members, workspace settings, and billing |
| Agent | Practising estate agent in the workspace | Operations: properties, calendar, pipeline, **own** inbox, **own** Gmail/WhatsApp, templates, contracts, AI. May be the **assigned agent** on a listing. Cannot change workspace settings, member roles, or billing |
| Assistant | Office staff | Narrower write access; cannot invite, manage integrations/templates/contracts, or be assigned as the responsible agent. Cannot connect a mailbox; Inbox stays empty unless they later gain a connection |
| Owner (Landlord) | Property owner (not staff) | Summary of their own property, pipeline view, documents |
| Current Tenant | Person living in the property | Enters their own availability, receives viewing notifications |
| Prospect (Applicant) | Arrives via public link/form | Account optional: fills the form + books a slot (OTP verified) |

**Assigned agent:** each property has one `assigned_user_id` (an `owner` or `agent` in that workspace). Default: the creator, or the oldest owner if an assistant creates the listing. Used for filters, calendar chips, notifications, and reporting — **not** for hiding rows. Co-agents are out of v1.

**Plans** are priced **per workspace**, not per account. The same login can be on a Team workspace and a Solo workspace independently. Catalog: `lib/plans.ts` (keys stay `free` = Solo and `pro` = Team). **Solo** is one agent: **$49 / month**, or **$29 / month** when billed annually ($348 a year), with **50** listings (**100** on the yearly plan) and **500** AI credits a month, or **750** a month on the yearly plan. **Team** is per agent, up to **50** seats: **$69 / agent / month**, or **$49 / agent / month** when billed annually ($588 a year per agent), with **200** listings per agent (**unlimited** on the yearly plan) and **750** AI credits a month, or **1,000** a month on the yearly plan. The allowance in force is the monthly figure until a yearly subscription is stored. Settings > Billing (owner-only) shows the selected plan at either interval, this-cycle usage, payment method and invoices — the same split as Cursor’s billing dashboard. The interval is a display choice until checkout; Stripe customer and subscription IDs will live on the workspace row when checkout ships.

## 3. Core Flows

### 3.1 Workspace & Property
1. An account creates a workspace (name, logo, timezone) and becomes its owner. The same account can create additional workspaces or accept invites into others; the sidebar switcher picks the active one (`temas_ws` cookie).
2. Properties under a workspace: **apartment, house, office, shop, warehouse, land** etc. Each listing has an **assigned agent** (owner or agent member). Everyone in the workspace can still see and edit every listing. **New property** is a short stepped wizard (type → name → address → rent → extras) with a progress bar; optional steps can be left blank. Editing stays the full sectioned form.
3. Property detail screen tabs (grouped like a CRM listing record):
   - **Listing** — Overview (photos, status, key facts, price, m², rooms / bedrooms / bathrooms, floor of building, address/map)
   - **Letting** — Viewings (calendar + booking history), Applications (applicants who landed in the pipeline)
   - **Record** — People (owner, current tenant, linked prospects), Files (contracts, deed/utility bill scans, insurance etc. — Supabase Storage), Inventory (fixtures list: item, quantity, condition note, photo)
   - **History** — Activity (audit log)
4. From the property record, **Map** opens a full-panel wireframe canvas of the parties around the listing (assigned agent, owner, current tenant). Open applications sit **under the property as a pipeline**: one column per stage, each card a **household** (the lead applicant plus anyone else who will live there — partner, children, other occupants). It is a presentation view the agent walks the owner through, not a tab — People and Applications stay the editable lists. Empty roles and empty stages stay as dashed placeholders so the diagram shape holds.

### 3.2 Multi-Party Viewing Calendar (core differentiator)
1. The agent opens a **viewing calendar** for the property and generates a public booking link.
2. The agent enters their own availability windows (recurring: "Weekdays 10:00–18:00").
3. If there is a current tenant, the agent invites the tenant to the calendar; the tenant enters their own windows ("Tue/Thu 17:00–20:00").
4. The **slot engine** computes the intersection of the two window sets and produces bookable slots using the booking duration (e.g. 30 min) + buffer (e.g. 15 min).
5. On the public link the prospect sees only these intersection slots, picks one, enters name/phone/email (verified by email OTP) → a booking is created.
6. After booking, confirmations + reminders (email/WhatsApp) go to the prospect, current tenant, the **assigned agent**, and every **workspace owner**. Staff pick email and/or WhatsApp per alert type in Settings > Notifications. Other agents/assistants are not emailed. The booking appears on the workspace calendar. Cancellation/rescheduling works both ways.
7. Optional: the owner can also enter windows → the intersection is computed across 3 sets (for properties that require owner presence).

### 3.3 Form Builder & Applicant Pipeline
1. The agent creates a form attached to a property (not drag-and-drop; a predefined field set + custom questions: income, employment, move-in date, pets, references, document upload).
2. The form is shared via a public link and can also be embedded into the public booking page ("Fill in the form before viewing this property").
3. Every **household** that submits lands in the pipeline at the **New** stage. The form contact is the lead applicant; other people who will live there are occupants on that same application (not separate pipeline cards).
4. Pipeline stages (customizable): New → Reviewing → Viewing Scheduled → Viewed → Shortlisted → Approved by Owner → Contract → Rented / Rejected.
5. **Owner presentation mode:** a read-only shareable link; a comparative card view of shortlisted **households** (who lives there, score, summary, documents). The owner clicks "Approve / Request changes" and the agent gets a notification. The property **Map** is the in-product version of that walkthrough: pipeline columns under the listing.

### 3.4 Unified Inbox
1. Each practising agent connects **their own** Google account (one OAuth grant for Gmail and Calendar) and WhatsApp from Settings > Integrations. Before it is linked, the Google and WhatsApp detail pages are setup views (steps; WhatsApp also shows a generated QR). After Google is connected, that page shows Mail and Calendar separately; calendar access can be added by reconnecting the same account. The connection is **account-owned** (`unique(user_id, kind)`): one Google mailbox and one WhatsApp per login, reused across workspaces. `workspace_id` on the integration is only the home workspace (the one they connected from) for unmatched inbound. WhatsApp Cloud API (Meta) sends and receives once connected; pairing can also complete by scanning the QR (`/i/wa/[token]`).
2. Inbox is **strictly private**. Only the connecting user sees those threads — not even a workspace owner. Conversations are still attributed to a workspace (contact/property match) so the Inbox in workspace A shows that agent’s threads for A. An empty Inbox (no threads) tells the agent to connect Gmail and WhatsApp and links to those setup pages. The list can be searched by subject, sender name, and sender email. An open email thread shows both sides: the other person’s messages and the agent’s own replies, including ones sent from Gmail. From the inbox the agent can also write a new email to any address; it sends from their Gmail and opens as a thread only they can see.
3. Every conversation is automatically matched to the relevant property and contact (phone/email match across the agent’s memberships).
4. An open email can be archived, reported as spam, moved to trash, marked unread, or starred. The same change is applied in Gmail. Archived, spam, and trashed threads leave this inbox. A new message on an archived thread brings it back.
5. Inline AI help:
   - **Draft with AI** — one-click draft from the conversation history + property context (language and tone selection)
   - Smart reminders ("You haven't heard back from Ahmet since yesterday's viewing; the rent negotiation was left open")
   - Conversation summary (for long threads)

### 3.5 AI Contract Mode
1. "Create contract" mode: pick a template (mandate, offer, lease, deposit, handover, vacate), parties and listing facts are pulled automatically, parameters are filled via a form (rent, deposit, term, increase rate).
2. AI produces a draft → the agent edits it in the editor → DOCX/PDF export → saved to Files → e-signature integration (phase 2; export + manual in v1).
3. System disclaimer: "This is not legal advice" on every output.

### 3.6 Home — AI Ask Anything
1. A Granola-style Home: centred greeting (“Hi {name}, ask anything”), prompt, coming up (viewings), suggestion chips. Recent chats live in the sidebar, not duplicated on Home. Empty blocks are omitted. The empty composer placeholder types and erases a few example questions. An open thread is a conversation with the prompt pinned to the bottom. The title row spans the canvas (12px from the sidebar and 12px from the right edge); a more menu on the right lets the agent **rename** or **delete** that chat.
2. Queries run RAG over the whole portfolio + **the caller’s** inbox + calendar: "How many viewings in September?", "Which properties are missing a deposit?", "What was discussed in the last conversation about the office in Kadıköy?" Ask never quotes a colleague’s mailbox.
3. Answers stream as chat bubbles. Properties, people and other workspace records in the prompt or the answer render as named clickable chips, not raw links.

### 3.7 Tasks
1. The workspace **Tasks** page lists operational to-dos in a Linear-style board: underline tabs (All / Assigned / Suggested), then one list card whose rows are grouped by property (unmatched items sit in a **No property** group). Anyone in the workspace (owner, agent, assistant) can create a task; the creator is the default **assignee** and can reassign to any member. Title, priority and assignee change inline on the row.
2. Each task has a **priority** (`low` / `medium` / `high`) and a status (`open` / `done`). Done tasks stay in a collapsed **Completed** group at the bottom of All / Assigned.
3. The main value is **AI suggestions from the signed-in user’s Gmail and WhatsApp threads**. After inbound ingest or an outbound reply, a haiku job extracts a specific unfinished obligation from that thread (not a generic “follow up” on every conversation) and writes **private suggestions** (same privacy as Inbox). The mailbox owner accepts (becomes an open, workspace-visible task assigned to them) or dismisses. If a later message in that thread shows the work is finished (keys received, contract sent) and the agent never ticked the row, the job marks that suggested or open task **done**. Colleagues never see another agent’s suggestions or the source thread; only the owner gets a conversation deep link.

## 4. Navigation (Granola pattern)

Sidebar (slim, icon + label), top to bottom:
- **Workspace switcher** — first control: current workspace name (or mark when collapsed). Opens a menu of memberships (name + role + check) and **New workspace**. Switching sets `temas_ws` and lands on Home. The same control sits on the Settings rail so Members apply to the active workspace. Integrations on that rail are the **signed-in user’s** mailboxes (not the agency’s).
- **Home** — centred ask, coming up, suggestion chips (optional `mine` filter)
- **Inbox** — the signed-in user’s email + WhatsApp only (search by subject, sender name, or sender email, plus optional Gmail / WhatsApp / unanswered / assigned-agent filters over **their** threads)
- **Calendar** — all viewings across the workspace (month/week views; property + assigned-agent filters). The signed-in user’s Google calendars can sit on the same grid, private to them; they choose which calendars to show, and a right-click recolors an event in Google.
- **Tasks** — Linear-style list (All / Assigned / Suggested), grouped by property, plus private AI suggestions from the caller’s inbox
- **Properties** — list/grid, status / type / assigned-agent filters, search

Settings is a gear icon above the user (not a sixth primary item), sitting next to Give feedback and separated from the identity by a hairline. Give feedback opens a dialog; the note is emailed to the product inbox (`FEEDBACK_TO`) via Resend (Mailpit in development). Destination: **Profile** (you + appearance + reply signature), Notifications, AI preferences, **Support** (included email, founder WhatsApp, Priority; a plan that is not current offers Buy for one month and Subscribe, and both save it without charging); **Workspace** general (name, **official company name**, logo, timezone), Members, Integrations (Google for mail and calendar, Outlook later, WhatsApp — the signed-in user’s accounts; each detail page has a **setup view** before it is connected — WhatsApp shows numbered steps and a generated pairing QR), Templates (form + contract), **Billing** (owner: selected plan, usage this cycle, invoices). Stripe checkout is a later phase. Danger zone stays under Workspace general.

Rule: no secondary top-level menus outside Settings; like Granola, everything lives in one place.

## 5. Invitation & Onboarding Design (least friction)

| Target | Mechanism |
|---|---|
| Teammate | Email invite → full account |
| Owner / Current Tenant | **Magic link** invite (passwordless, Supabase OTP). On first sign-in only the related property is visible. Tenant flow: welcome → enter availability windows (3-step wizard) → done |
| Prospect | No account. Public links: booking + form. Identity verified with email OTP; the link returns to a persistent personal page |
| Invite via WhatsApp | The agent can send the invite link from the product using a WhatsApp template |

### 5.1 Marketing site

The public landing lives at `/`. Signed-in users skip it and land on Home. It speaks to the primary ICP (independent agents and small rental agencies) and leads with the differentiation thesis: other tools keep records, Temas moves the letting forward. The page walks the core flows in order (viewing calendar, inbox with Draft with AI, applicant pipeline, Ask anything, tasks from the inbox, contracts) and then the trust points (private inbox, read-only AI, scoped links for tenants and owners, EU hosting). Plans show the Solo and Team prices from `lib/plans.ts`, with a Monthly / Yearly switch (yearly shows the lower monthly price, billed once a year). Each plan offers **Get started**, which opens sign-up. Signup does not charge; checkout is later. The sign-in and sign-up screens carry the same look as the landing and link to each other. No popups, countdowns or pressure copy. Claims stay inside what v1 actually does.

## 6. Out of Scope (v1)

- Payments / rent collection, accounting
- Stripe checkout (Settings > Billing already shows the catalog plan and invoices; payment and PDFs are later)
- Sharing an inbox with an assistant or workspace-owner oversight
- Hard isolation of listings by assigned agent (assignment is metadata)
- e-signature integration (v1: export only)
- Listing sync to MLS / portals
- Native mobile app (responsive web + PWA manifest is enough)
- Multiple languages: v1 = **English UI**; i18n infrastructure is in place (Turkish as the second locale later)

## 7. Success Metrics (think ahead; put the event infrastructure in place now)

- Activation: first property created in < 5 min; tenant invite acceptance rate
- Booking conversion: public link views → bookings
- AI acceptance rate: share of drafts sent without edits
- Time saved: organization time per viewing (target: >70% reduction)

## 8. State Model (Property lifecycle)

`draft → active (for rent) → viewing_in_progress → application_review → contract_pending → rented → archived`

Every transition is written to the Activity log; the AI summary on Home is fed by this stream.
