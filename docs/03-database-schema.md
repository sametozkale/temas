# 03 — Database Schema (Postgres / Supabase / Drizzle)

> Every table has `id uuid default gen_random_uuid()`, `created_at`, `updated_at`; they are not repeated below.
> Deletion policy: operational records are soft-deleted (`deleted_at`); the audit log is never deleted.
> Times: always `timestamptz` (UTC). Recurring structures use `rrule text` + `timezone text`.

## 1. Identity & Workspace

```sql
profiles ( id uuid pk references auth.users, full_name text, phone text, avatar_url text, locale text default 'en',
           notification_prefs jsonb,
           support_plan text default 'included' check (support_plan in ('included','founder','priority')),
           support_billing text default 'none' check (support_billing in ('none','month','subscribe')),
           support_period_ends_at timestamptz,
           stripe_customer_id text, support_subscription_id text )
                                -- avatar_url is a storage path in the public `avatars` bucket: profiles/{userId}/{uuid}.ext
                                -- notification_prefs: per-type `{ email, whatsapp }` matrix (digest, viewings, viewing_reminders, applications, owner_decisions). Settings > Notifications.
                                -- Support is per account. month is one payment; subscribe is monthly. Empty Stripe ids until checkout.

workspaces (
  name text, slug text unique, logo_url text, timezone text default 'Europe/Istanbul',
  legal_name text,                    -- official company name on contracts; optional; team still sees `name`
  plan text default 'free',            -- catalog key in lib/plans.ts (free|pro); billed per workspace, not per account
  billing_interval text default 'month' check (billing_interval in ('month','year')),
  billing_status text default 'none' check (billing_status in ('none','active','past_due','canceled')),
  stripe_customer_id text, stripe_subscription_id text
  -- logo_url is a storage path: workspaces/{workspaceId}/{uuid}.ext
  -- Settings > Billing (owner) reads `plan` and `billing_interval`. Current is that interval only.
  -- The webhook sets billing_status. none means Stripe has not confirmed a subscription yet.
)

workspace_members (
  workspace_id uuid references workspaces, user_id uuid references auth.users,
  role text check (role in ('owner','agent','assistant')),
  unique(workspace_id, user_id)
)

invites (
  workspace_id uuid, email text, role text check (role in ('agent','assistant')),
  token text unique, expires_at timestamptz, accepted_at timestamptz
)
```

## 2. Contacts (every person in one table)

The agent's address book; an auth account is **optional** — a tenant/owner can be linked later via magic link, a prospect may never create an account.

```sql
contacts (
  workspace_id uuid references workspaces,
  user_id uuid references auth.users,        -- nullable (not invited yet)
  full_name text not null, email text, phone text,
  email_verified bool default false, phone_verified bool default false,
  notes text,
  unique(workspace_id, email), unique(workspace_id, phone)
)
```

## 3. Properties

```sql
properties (
  workspace_id uuid references workspaces,
  assigned_user_id uuid references auth.users,  -- responsible owner|agent in this workspace; not an RLS scope
  type text check (type in ('apartment','house','office','shop','warehouse','land','other')),
  title text not null, status text default 'draft'
    check (status in ('draft','active','viewing_in_progress','application_review','contract_pending','rented','archived')),
  address jsonb,                -- {line, district, city, country, lat, lng}
                               -- country/city are ISO-backed names from CountriesNow; district is free text
  timezone text default 'Europe/Istanbul',
  rent_amount numeric, currency text default 'TRY',  -- ISO 4217; app list is Intl.supportedValuesOf('currency')
  deposit_amount numeric, dues_amount numeric,
  area_m2 numeric, rooms text, bedrooms int, bathrooms int,
  floor int, total_floors int, year_built int,
  condition text check (condition in ('new','renovated','good','fair','needs_work')),
  available_from date,
  features jsonb default '{}',  -- furnished, parking, elevator, balcony, garden, pets_allowed,
                                -- air_conditioning, heating_central, dishwasher, washing_machine,
                                -- dryer, internet, storage, terrace, accessible
  description text, cover_media_id uuid, deleted_at timestamptz
)
-- index (workspace_id, assigned_user_id)
-- app validation: assigned member role in ('owner','agent'); assistants cannot be assigned
-- on member remove: reassign listings to the oldest remaining owner

property_media ( property_id uuid, storage_path text, kind text check (kind in ('photo','video','plan')), sort_order int )

inventory_items (
  property_id uuid, name text, quantity int default 1,
  condition text check (condition in ('new','good','fair','poor')), note text, photo_path text
)

documents ( property_id uuid, kind text, title text, storage_path text, created_by uuid, meta jsonb default '{}' )

property_people (                  -- owner/tenant links; the heart of the invite mechanism
  property_id uuid, contact_id uuid references contacts,
  relation text check (relation in ('owner','current_tenant')),
  invite_token text unique, invite_expires_at timestamptz, joined_at timestamptz,
  unique(property_id, contact_id, relation)
)

activity_log ( workspace_id uuid, property_id uuid, actor_id uuid, action text, entity text, entity_id uuid, data jsonb )
```

## 4. Viewing & Scheduling (★ core)

```sql
viewing_calendars (                -- one per property
  property_id uuid unique, slot_duration_min int default 30, buffer_min int default 15,
  min_notice_hours int default 4, max_days_ahead int default 21,
  require_form_first bool default false, form_id uuid,
  public_token text unique not null, is_published bool default false
)

availability_windows (             -- who is available: agent and/or current_tenant (and optionally owner)
  viewing_calendar_id uuid references viewing_calendars,
  participant_kind text check (participant_kind in ('agent','current_tenant','owner')),
  contact_id uuid references contacts,          -- for the agent: the workspace member's contact
  rrule text not null,            -- e.g. FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
  start_time time not null, end_time time not null,
  timezone text not null,
  effective_from date, effective_until date
)

availability_exceptions (          -- "I'm off that day" / one-off addition
  availability_window_id uuid references availability_windows,
  date date not null, kind text check (kind in ('block','override')),
  start_time time, end_time time  -- filled when kind = override
)

viewing_slots (                    -- materialized intersection (produced by Inngest; engine: lib/slots)
  viewing_calendar_id uuid,
  starts_at timestamptz not null, ends_at timestamptz not null,
  status text default 'open' check (status in ('open','booked','blocked','cancelled')),
  unique(viewing_calendar_id, starts_at)
)

bookings (
  viewing_slot_id uuid references viewing_slots,
  property_id uuid, contact_id uuid references contacts,   -- prospect (OTP verified)
  status text default 'confirmed' check (status in ('confirmed','cancelled','completed','no_show')),
  note text, cancel_token text unique, cancelled_by text
)
```

## 5. Forms & Pipeline

```sql
forms (
  property_id uuid, title text,
  schema jsonb not null,           -- field definitions: [{key,label,type,required,options}]
  public_token text unique, is_published bool default false
)

form_submissions (
  form_id uuid, contact_id uuid references contacts,
  answers jsonb not null, attachments jsonb default '[]', status text default 'received'
)

pipeline_stages ( property_id uuid, name text, position int, color text, is_terminal bool default false )
applications (
  property_id uuid, contact_id uuid, submission_id uuid references form_submissions,
  stage_id uuid references pipeline_stages, score int, ai_summary text, decided_at timestamptz,
  unique (property_id, contact_id)
)
-- One row per household. contact_id is the lead applicant; other occupants live on
-- the form submission (`occupants` count + `household` names), not as extra applications.
owner_views ( property_id uuid, public_token text unique, show_stages uuid[] , expires_at timestamptz )  -- owner presentation link
-- Owner Approve / Request changes (docs/00 §3.3) writes activity_log + moves stage; no extra columns.
```

## 6. Inbox

```sql
integrations (
  user_id uuid references auth.users not null,  -- mailbox owner; unique(user_id, kind)
  workspace_id uuid,                            -- home workspace (connected-from); unmatched inbound fallback
  kind text check (kind in ('gmail','outlook','whatsapp')),
  status text default 'connected', credentials jsonb,        -- store encrypted (pgsodium/vault)
  external_id text, last_synced_at timestamptz
)

conversations (
  workspace_id uuid, user_id uuid references auth.users not null,  -- mailbox owner
  integration_id uuid, channel text check (channel in ('email','whatsapp')),
  contact_id uuid references contacts, property_id uuid,    -- result of automatic matching
  subject text, last_message_at timestamptz, -- latest message in the thread, not the first
  ai_summary text, is_read bool default false,
  mailbox_state text default 'inbox' check (mailbox_state in ('inbox','archived','trash','spam')),
  starred bool default false
)
-- index (workspace_id, user_id)

messages (
  conversation_id uuid references conversations, direction text check (direction in ('in','out')),
  body text, body_html text, external_id text, sent_at timestamptz, meta jsonb default '{}'
)

ai_drafts ( conversation_id uuid, body text, tone text, status text default 'pending', model text )
```

## 6.1 Tasks

```sql
tasks (
  workspace_id uuid references workspaces not null,
  property_id uuid references properties,          -- optional; unmatched sit in a "No property" group
  title text not null, description text,
  priority text default 'medium' check (priority in ('low','medium','high')),
  status text default 'open' check (status in ('suggested','open','done','dismissed')),
  assignee_id uuid references auth.users not null,
  created_by uuid references auth.users not null,
  source text default 'manual' check (source in ('manual','ai')),
  conversation_id uuid references conversations,   -- AI suggestions only; thread stays private
  fingerprint text,                                -- dedupe AI rows per conversation
  user_id uuid references auth.users               -- mailbox owner; set only while suggested/dismissed
)
-- unique (conversation_id, fingerprint) where conversation_id is not null
-- index (workspace_id, status), (workspace_id, property_id)
```

## 7. AI

```sql
ai_threads ( workspace_id uuid, user_id uuid, title text )
ai_messages ( thread_id uuid, role text check (role in ('user','assistant','tool')), content text, tool_calls jsonb,
              credits integer not null default 0 )

embeddings (                        -- RAG corpus: property, document text, conversation summary
  workspace_id uuid, entity text, entity_id uuid, chunk text,
  embedding vector(1536), meta jsonb default '{}'
)
-- create index on embeddings using hnsw (embedding vector_cosine_ops);

contract_templates ( workspace_id uuid, name text, body_md text, variables jsonb )
contracts (
  property_id uuid, template_id uuid, application_id uuid, status text default 'draft',
  values jsonb, output_doc_path text, output_pdf_path text, disclaimer_acknowledged bool default false
)

reminders (
  workspace_id uuid, user_id uuid, entity text, entity_id uuid,
  kind text, message text, due_at timestamptz, delivered_at timestamptz, source text default 'ai'
)
```

## 8. RLS Notes

- Main rule: no row is visible without a `workspace_members` membership. Assigned agent is metadata; members still SELECT/UPDATE every property in the workspace.
- **Mailbox exception:** `integrations` and `conversations` (plus `messages` / `ai_drafts`) are visible only when `user_id = auth.uid()`. A workspace owner cannot read another agent’s inbox. The conversation’s `workspace_id` still requires membership so leaving the workspace hides those threads.
- **Tasks:** `open` / `done` rows are visible to every workspace member. `suggested` / `dismissed` rows are visible only when `user_id = auth.uid()` (the mailbox owner). Accepting a suggestion sets `status=open` and clears `user_id`.
- **Restricted SELECT** for owners/tenants through `property_people`: only the linked property's viewing_slots, bookings (their own), documents (shared kinds), pipeline (owner: only the `owner_views` scope).
- Public token table access: the anon role may only SELECT `viewing_slots(open)`, `forms(published)`, `viewing_calendars(published)` and INSERT bookings/form_submissions — via token-validating SECURITY DEFINER functions. Never write broad anon policies.
- `integrations.credentials` is service role only.
- Helper functions (SECURITY DEFINER, `drizzle/0002_auth_helpers.sql`): `is_workspace_member(ws)`, `workspace_role(ws)`, `shares_workspace_with(user)`; `handle_new_user()` trigger creates the `profiles` row.
- Policies are declared next to the tables with Drizzle `pgPolicy` (`lib/db/rls.ts` helpers) and land in migrations automatically.

## 9. Storage

- **Private** buckets `property-media` and `documents` (drizzle/0006): object paths are `{workspaceId}/{propertyId}/{uuid}.ext`. Storage RLS lets workspace members read/write objects whose first path segment is a workspace they belong to.
- **Public** bucket `avatars` (drizzle/0019):
  - `profiles/{userId}/{uuid}.ext` — the signed-in user may insert/update/delete their own folder; anyone may read.
  - `workspaces/{workspaceId}/{uuid}.ext` — the workspace owner may insert/update/delete; anyone may read.
- `profiles.avatar_url` and `workspaces.logo_url` store the **object path**, not a full URL. The app builds `…/storage/v1/object/public/avatars/{path}` from `NEXT_PUBLIC_SUPABASE_URL`.
- Property media/documents still use signed upload + signed download URLs. Avatars use a signed upload, then a public URL for display.
