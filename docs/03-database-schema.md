# 03 — Database Schema (Postgres / Supabase / Drizzle)

> Tüm tablolarda `id uuid default gen_random_uuid()`, `created_at`, `updated_at` vardır; tekrar yazılmadı.
> Silme politikası: operasyonel kayıtlar soft-delete (`deleted_at`), audit log asla silinmez.
> Saatler: her zaman `timestamptz` (UTC). Recurring yapılar `rrule text` + `timezone text`.

## 1. Kimlik & Workspace

```sql
profiles ( id uuid pk references auth.users, full_name text, phone text, avatar_url text, locale text default 'tr' )

workspaces ( name text, slug text unique, logo_url text, timezone text default 'Europe/Istanbul', plan text default 'free' )

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

## 2. Contacts (tüm insanlar tek tabloda)

Agent'in rehberi; auth hesabı **opsiyonel** — kiracı/owner magic link ile sonra bağlanabilir, prospect hiç hesap açmayabilir.

```sql
contacts (
  workspace_id uuid references workspaces,
  user_id uuid references auth.users,        -- null olabilir (henüz davet edilmedi)
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
  type text check (type in ('apartment','house','office','shop','warehouse','land','other')),
  title text not null, status text default 'draft'
    check (status in ('draft','active','viewing_in_progress','application_review','contract_pending','rented','archived')),
  address jsonb,                -- {line, district, city, country, lat, lng}
  timezone text default 'Europe/Istanbul',
  rent_amount numeric, currency text default 'TRY', deposit_amount numeric,
  area_m2 numeric, rooms text, floor int, features jsonb default '{}',
  description text, cover_media_id uuid, deleted_at timestamptz
)

property_media ( property_id uuid, storage_path text, kind text check (kind in ('photo','video','plan')), sort_order int )

inventory_items (
  property_id uuid, name text, quantity int default 1,
  condition text check (condition in ('new','good','fair','poor')), note text, photo_path text
)

documents ( property_id uuid, kind text, title text, storage_path text, created_by uuid, meta jsonb default '{}' )

property_people (                  -- owner/tenant bağları; davet mekanizmasının kalbi
  property_id uuid, contact_id uuid references contacts,
  relation text check (relation in ('owner','current_tenant')),
  invite_token text unique, invite_expires_at timestamptz, joined_at timestamptz,
  unique(property_id, contact_id, relation)
)

activity_log ( workspace_id uuid, property_id uuid, actor_id uuid, action text, entity text, entity_id uuid, data jsonb )
```

## 4. Viewing & Scheduling (★ çekirdek)

```sql
viewing_calendars (                -- property başına bir tane
  property_id uuid unique, slot_duration_min int default 30, buffer_min int default 15,
  min_notice_hours int default 4, max_days_ahead int default 21,
  require_form_first bool default false, form_id uuid,
  public_token text unique not null, is_published bool default false
)

availability_windows (             -- kim müsait: agent ve/veya current_tenant (ve opsiyonel owner)
  viewing_calendar_id uuid references viewing_calendars,
  participant_kind text check (participant_kind in ('agent','current_tenant','owner')),
  contact_id uuid references contacts,          -- agent için workspace_member'ın contact'ı
  rrule text not null,            -- ör: FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
  start_time time not null, end_time time not null,
  timezone text not null,
  effective_from date, effective_until date
)

availability_exceptions (          -- "o gün izinliyim" / tek seferlik ekleme
  availability_window_id uuid references availability_windows,
  date date not null, kind text check (kind in ('block','override')),
  start_time time, end_time time  -- override ise dolu
)

viewing_slots (                    -- materialized kesişim (Inngest üretir; motor: lib/slots)
  viewing_calendar_id uuid,
  starts_at timestamptz not null, ends_at timestamptz not null,
  status text default 'open' check (status in ('open','booked','blocked','cancelled')),
  unique(viewing_calendar_id, starts_at)
)

bookings (
  viewing_slot_id uuid references viewing_slots,
  property_id uuid, contact_id uuid references contacts,   -- prospect (OTP doğrulamalı)
  status text default 'confirmed' check (status in ('confirmed','cancelled','completed','no_show')),
  note text, cancel_token text unique, cancelled_by text
)
```

## 5. Forms & Pipeline

```sql
forms (
  property_id uuid, title text,
  schema jsonb not null,           -- alan tanımları: [{key,label,type,required,options}]
  public_token text unique, is_published bool default false
)

form_submissions (
  form_id uuid, contact_id uuid references contacts,
  answers jsonb not null, attachments jsonb default '[]', status text default 'received'
)

pipeline_stages ( property_id uuid, name text, position int, color text, is_terminal bool default false )
applications (
  property_id uuid, contact_id uuid, submission_id uuid references form_submissions,
  stage_id uuid references pipeline_stages, score int, ai_summary text, decided_at timestamptz
)
owner_views ( property_id uuid, public_token text unique, show_stages uuid[] , expires_at timestamptz )  -- owner sunum linki
```

## 6. Inbox

```sql
integrations (
  workspace_id uuid, kind text check (kind in ('gmail','outlook','whatsapp')),
  status text default 'connected', credentials jsonb,        -- şifreli sakla (pgsodium/vault)
  external_id text, last_synced_at timestamptz, unique(workspace_id, kind)
)

conversations (
  workspace_id uuid, integration_id uuid, channel text check (channel in ('email','whatsapp')),
  contact_id uuid references contacts, property_id uuid,    -- otomatik eşleşme sonucu
  subject text, last_message_at timestamptz, ai_summary text, is_read bool default false
)

messages (
  conversation_id uuid references conversations, direction text check (direction in ('in','out')),
  body text, body_html text, external_id text, sent_at timestamptz, meta jsonb default '{}'
)

ai_drafts ( conversation_id uuid, body text, tone text, status text default 'pending', model text )
```

## 7. AI

```sql
ai_threads ( workspace_id uuid, user_id uuid, title text )
ai_messages ( thread_id uuid, role text check (role in ('user','assistant','tool')), content text, tool_calls jsonb )

embeddings (                        -- RAG korpusu: property, document metni, conversation özeti
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

## 8. RLS Notları

- Ana kural: `workspace_members` üyeliği olmayan hiçbir satır görünmez.
- `property_people` üzerinden owner/tenant'a **kısıtlı SELECT**: sadece bağlı property'nin viewing_slots, bookings (kendi adına), documents (paylaşılan kind'lar), pipeline (owner: sadece `owner_views` kapsamı).
- Public token tablosu erişimi: anon role sadece `viewing_slots(open)`, `forms(published)`, `viewing_calendars(published)` SELECT + bookings/form_submissions INSERT (token doğrulamalı SECURITY DEFINER fonksiyonlarla — asla geniş anon policy yazma).
- `integrations.credentials` sadece service role.
