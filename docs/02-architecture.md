# 02 — Architecture & Tech Stack

## 1. Stack Kararları

| Katman | Seçim | Gerekçe |
|---|---|---|
| Framework | **Next.js 15 (App Router)**, TypeScript strict | Tek repo full-stack; RSC + Server Actions |
| UI | shadcn/ui (customized, bkz. 01) + Tailwind v4 + Hugeicons + Inter/Newsreader | Tasarım dili dokümanına bak |
| DB / Auth / Storage | **Supabase** (Postgres + RLS + Storage + pgvector) | Magic-link davetleri, dosyalar, RAG için vector tek yerde |
| ORM | **Drizzle** (`drizzle-orm` + `drizzle-kit`) | Tip güvenli, migration kontrolü bizde |
| Server mutasyonları | **Server Actions** (form submit'ler) + route handler'lar (webhook'lar) | |
| AI | **Vercel AI SDK** + provider: Anthropic (draft/contract) + OpenAI embeddings (`text-embedding-3-small`, pgvector) | Streaming UI hazır |
| Arka plan işleri | **Inngest** (slot materialization, hatırlatıcılar, inbox sync, embedding) | Cron + retry + fan-out hazır |
| Email | Gönderim: **Resend**. Inbound/sync: **Gmail API + Outlook Graph webhook** (v1: Gmail önce) | |
| WhatsApp | **WhatsApp Business Cloud API** (Meta) — template mesajlar + webhook inbound | |
| Form altyapısı | react-hook-form + zod (builder şeması DB'de JSON) | |
| Tarih/saat | `date-fns` + `rrule` paketi; **tüm saatler UTC saklanır**, property'nin timezone'uyla render | Şart |
| Test | Vitest (unit: slot engine), Playwright (kritik akışlar) | |
| Deploy | Vercel + Supabase (region: eu-central — Tallinn/TR gecikmesi dengeli) | |

## 2. Monorepo Değil — Tek Next App, Net Klasör Yapısı

```
app/
  (auth)/login, /auth/callback, /auth/verify
  (app)/                       # korumalı workspace alanı
    home/  inbox/  calendar/  properties/
    properties/[id]/ (overview|inventory|people|files|viewings|applications|activity)
    pipeline/[propertyId]/
    settings/(general|members|integrations|notifications|ai|templates|billing)
  (public)/
    b/[token]/                 # public booking sayfası
    f/[token]/                 # public form
    o/[token]/                 # owner pipeline sunumu (read-only)
  api/
    webhooks/(gmail|whatsapp|resend)/route.ts
    ai/(chat|draft|contract)/route.ts
    cron/  (inngest serve: api/inngest/route.ts)
components/
  ui/          # shadcn (patch'li — elle düzenlenir)
  icons.ts     # Hugeicons merkezi re-export
  prompt-bar.tsx  event-chip.tsx  page-header.tsx  empty-state.tsx
  properties/  inbox/  calendar/  pipeline/  forms/  ai/
lib/
  db/          # drizzle client + schema/ (tablo başına dosya)
  slots/       # ★ slot engine (saf fonksiyonlar, IO yok — test edilebilir)
  ai/          # prompts/, tools/, rag.ts, drafts.ts, contract.ts
  integrations/(gmail|outlook|whatsapp|resend)/
  auth.ts  permissions.ts  rate-limit.ts
inngest/       # fonksiyonlar: materialize-slots, reminders, inbox-sync, embed-*
emails/        # react-email şablonları (davet, booking onay, hatırlatıcı)
docs/          # ← bu md dosyaları repo'da burada yaşar
.cursor/rules/ # ← 07-cursor-rules.md içeriği buraya dosyalanır
```

## 3. Yetkilendirme Modeli

- Kaynak: `workspace_members.role` + `property_shares` (owner/tenant bağları), bkz. 03.
- Server tarafında tek kapı: `lib/permissions.ts → requireAbility(user, action, resource)`.
- RLS politikaları DB'de de aynalır (defense-in-depth); public route'lar (`b/`, `f/`, `o/`) **token tabanlı**, RLS bypass eden service-role kullanmaz — public tablolar ayrı politikayla.

## 4. Ortamlar & Değişkenler

`.env.example` zorunlu: `DATABASE_URL`, `SUPABASE_*`, `RESEND_API_KEY`, `GOOGLE_CLIENT_*`, `META_WHATSAPP_*`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `INNGEST_*`, `APP_URL`.
Üç ortam: local (Supabase CLI ile lokal Postgres), preview (Vercel), prod.

## 5. Kalite Kapıları (her PR)

- `tsc --noEmit`, `eslint`, `prettier --check`
- Slot engine unit testleri yeşil olmadan merge yok
- Playwright smoke: signup → property → availability → public booking
- Lighthouse: public sayfalarda (b/, f/) 95+ performans hedefi (SEO yok ama hız şart — link WhatsApp'tan açılacak)

## 6. Bilinçli Erteleme Kararları

- e-imza: v1 dışı (export + status takibi yeterli)
- Outlook sync: Gmail sonrası fazda
- Mobil: responsive + PWA manifest; native yok
- i18n: `next-intl` altyapısı kurulur ama v1'de sadece `tr` locale içerik doldurulur
