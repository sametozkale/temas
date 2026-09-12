# PRD — AI-Native Property Management Platform for Real Estate Agents

> Codename: **Havn** (placeholder). This file is the product's single source of truth. It is given to Cursor as context in every phase.

## 1. Vision

A platform that lets real estate agents run their entire rental-focused operation — portfolio management, viewing scheduling, applicant pipeline, communication and contracts — inside a single AI-native workspace.

**Primary ICP:** Independent agents and small agencies (1–10 people) with a rental-heavy portfolio.

**Differentiation thesis:** Existing property management software is a *system of record*. This product is a *system of action*: automatic booking from multi-party availability intersection, one-click AI communication drafts, an AI contract mode and natural-language querying across the whole portfolio.

## 2. Personas & Roles

| Role | Definition | Access |
|---|---|---|
| Agent (Admin) | The agent, workspace owner | Everything |
| Teammate / Assistant | Office staff | Inside the workspace, to the extent the agent authorizes |
| Owner (Landlord) | Property owner | Summary of their own property, pipeline view, documents |
| Current Tenant | Person living in the property | Enters their own availability, receives viewing notifications |
| Prospect (Applicant) | Arrives via public link/form | Account optional: fills the form + books a slot (OTP verified) |

## 3. Core Flows

### 3.1 Workspace & Property
1. The agent creates a workspace (name, logo, language/basic settings).
2. Unlimited properties under a workspace: **apartment, house, office, shop, warehouse, land** etc.
3. Property detail screen tabs:
   - Overview (photos, status, key facts, price, m², rooms, address/map)
   - Inventory (fixtures list: item, quantity, condition note, photo)
   - People (owner, current tenant, linked prospects)
   - Files (contracts, deed/utility bill scans, insurance etc. — Supabase Storage)
   - Viewings (calendar + booking history)
   - Applications (applicants who landed in the pipeline)
   - Activity (audit log)

### 3.2 Multi-Party Viewing Calendar (core differentiator)
1. The agent opens a **viewing calendar** for the property and generates a public booking link.
2. The agent enters their own availability windows (recurring: "Weekdays 10:00–18:00").
3. If there is a current tenant, the agent invites the tenant to the calendar; the tenant enters their own windows ("Tue/Thu 17:00–20:00").
4. The **slot engine** computes the intersection of the two window sets and produces bookable slots using the booking duration (e.g. 30 min) + buffer (e.g. 15 min).
5. On the public link the prospect sees only these intersection slots, picks one, enters name/phone/email (verified by email OTP) → a booking is created.
6. After booking, confirmations + reminders (email/WhatsApp) go to all parties and the booking appears in the agent's calendar view. Cancellation/rescheduling works both ways.
7. Optional: the owner can also enter windows → the intersection is computed across 3 sets (for properties that require owner presence).

### 3.3 Form Builder & Applicant Pipeline
1. The agent creates a form attached to a property (not drag-and-drop; a predefined field set + custom questions: income, employment, move-in date, pets, references, document upload).
2. The form is shared via a public link and can also be embedded into the public booking page ("Fill in the form before viewing this property").
3. Every applicant who submits lands in the pipeline at the **New** stage.
4. Pipeline stages (customizable): New → Reviewing → Viewing Scheduled → Viewed → Shortlisted → Approved by Owner → Contract → Rented / Rejected.
5. **Owner presentation mode:** a read-only shareable link; a comparative card view of shortlisted applicants (score, summary, documents). The owner clicks "Approve / Request changes" and the agent gets a notification.

### 3.4 Unified Inbox
1. The agent connects Gmail/Outlook (OAuth) and the WhatsApp Business Cloud API from Settings > Integrations.
2. All conversations live in one Inbox; every conversation is automatically matched to the relevant property and contact (phone/email match).
3. Inline AI help:
   - **Draft with AI** — one-click draft from the conversation history + property context (language and tone selection)
   - Smart reminders ("You haven't heard back from Ahmet since yesterday's viewing; the rent negotiation was left open")
   - Conversation summary (for long threads)

### 3.5 AI Contract Mode
1. "Create contract" mode: pick a template (rental agreement), parties are pulled automatically from property/people, parameters are filled via a form (rent, deposit, term, increase rate).
2. AI produces a draft → the agent edits it in the editor → DOCX/PDF export → saved to Files → e-signature integration (phase 2; export + manual in v1).
3. System disclaimer: "This is not legal advice" on every output.

### 3.6 Home — AI Ask Anything
1. A Granola-style bottom-centre prompt input on the Home screen.
2. Queries run RAG over the whole portfolio + inbox + calendar: "How many viewings in September?", "Which properties are missing a deposit?", "What was discussed in the last conversation about the office in Kadıköy?"
3. Answers are rendered as cards with deep links to the source property/conversation.

## 4. Navigation (Granola pattern)

Sidebar (slim, icon + label):
- **Home** — Coming up (upcoming viewings), AI activity summary, prompt input
- **Inbox** — unified email + WhatsApp
- **Calendar** — all viewings across the workspace (month/week views; property filter)
- **Properties** — list/grid, status filter, search
- **Settings** — General, Members, Integrations (Gmail/Outlook/WhatsApp), Notifications, AI preferences, Templates (form + contract), Billing, Danger zone

Rule: no secondary top-level menus outside Settings; like Granola, everything lives in one place.

## 5. Invitation & Onboarding Design (least friction)

| Target | Mechanism |
|---|---|
| Teammate | Email invite → full account |
| Owner / Current Tenant | **Magic link** invite (passwordless, Supabase OTP). On first sign-in only the related property is visible. Tenant flow: welcome → enter availability windows (3-step wizard) → done |
| Prospect | No account. Public links: booking + form. Identity verified with email OTP; the link returns to a persistent personal page |
| Invite via WhatsApp | The agent can send the invite link from the product using a WhatsApp template |

## 6. Out of Scope (v1)

- Payments / rent collection, accounting
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
