# 06 — Cursor Build Roadmap (Faz Faz, Adım Adım)

> **Nasıl kullanılır:** Her faz = ayrı Cursor sohbeti (yeni chat). Sohbete başlarken context'e eklenecekler her fazın başında yazılı. Faz bitmeden sonraki faza geçme. Her faz sonunda "definition of done" kontrol listesini işaretle ve commit'le.

## Ön Hazırlık (tek sefer)

1. `docs/` altına 00–07 md dosyalarını koy (bu dosyalar).
2. `.cursor/rules/` kur (07-cursor-rules.md içeriğini oradaki dosya adlarına böl).
3. Her yeni Cursor chat'inde ilk mesaj şablonu:
   > "Bu projeyi docs/00-prd.md vizyonu ile geliştiriyoruz. Tasarım dili: docs/01-design-system.md. Şimdi docs/06-roadmap.md içinde FAZ X'i uygulayacağız. İlgili spec: docs/0Y-….md. Önce plan çıkar, onayımı bekle, sonra kodla."

---

## FAZ 0 — Scaffold & Design Tokens (0.5 gün)
**Context:** 01, 02, 07
- create-next-app + shadcn init + bileşen add listesi (01-design-system.md §4)
- globals.css token seti (light+dark), Inter + Newsreader `next/font` kurulumu, Tailwind v4 theme binding
- Hugeicons kurulumu + `components/icons.ts`
- ui/ patch'leri (button soft/xs/pill variant, card/input shadow-none, badge soft varyantlar)
- `prompt-bar`, `page-header`, `empty-state`, `event-chip` iskeletleri
- AppShell: sidebar + içerik layout, 5 nav item'lı (Home, Inbox, Calendar, Properties, Settings — içerik stub)
**DoD:** `npm run dev` açılıyor; sidebar + örnek sayfa Granola token'larıyla render; tsc+eslint yeşil.

## FAZ 1 — Auth & Workspace (1 gün)
**Context:** 02, 03 (§1)
- Supabase kurulumu (CLI lokal + proje), Drizzle schema: profiles, workspaces, workspace_members, invites
- Auth: email magic link (Supabase), callback route, middleware ile (app) koruması
- Onboarding: ilk login → workspace oluşturma akışı (ad, timezone)
- Settings > Members: teammate davet (invite token + accept akışı)
- `lib/permissions.ts` + activity_log helper
**DoD:** signup → workspace → ikinci kullanıcı davet kabulü uçtan uca çalışıyor; yetkisiz route redirect.

## FAZ 2 — Properties CRUD + Detay (2 gün)
**Context:** 00 (§3.1), 01, 03 (§2–3)
- Schema: properties, property_media, inventory_items, documents, property_people, contacts, activity_log
- Properties listesi: grid/liste toggle, durum badge'leri, arama, tip filtresi
- Create/edit: çok adımlı olmayan tek form (tip, başlık, adres, fiyat, detaylar) + foto upload (Supabase Storage, drag-drop, sıralama)
- Detay sayfası sekmeleri: Overview / Inventory / People / Files / Viewings(stub) / Applications(stub) / Activity
- People sekmesi: contact ekle (owner/tenant), davet linki üret (şimdilik sadece kopyala — magic link FAZ 3'te)
- Files: upload/liste/indirme; Activity: append-only log görünümü
**DoD:** Property yaratılıp tüm sekmelerde CRUD; audit log'a düşüyor; RLS test'leri (başka workspace göremiyor).

## FAZ 3 — Takvim & Slot Motoru + Public Booking (3 gün) ★
**Context:** 04, 03 (§4), 00 (§3.2)
- `lib/slots/` tamamen test-first: önce 05'teki test senaryolarını yazdır, sonra implement ettir (TDD bu fazda şart)
- Schema: viewing_calendars, availability_windows (+exceptions), viewing_slots, bookings
- UI — Viewings sekmesi: takvim yayınla, slot ayarları, agent pencere editörü (haftalık ızgara), tenant daveti (magic link + 3 adımlı "müsaitliğini gir" wizard'ı)
- Inngest: materialize-slots + gece cron
- Public `/b/[token]`: gün listesi + slot chip'leri + OTP + onay + .ics + iptal (Granola diliyle: serif başlık, tek sütun, hairline)
- Agent calendar sayfası: tüm property'lerin booking'leri (liste görünüm yeterli, ay görünümü faz 7'de)
**DoD:** Uçtan uca: agent pencere gir → kiracı linkten pencere gir → kesişim slotlar public linkte → OTP ile booking → her iki tarafa onay emaili → iptal. Slot engine test coverage ≥90%.

## FAZ 4 — Forms & Pipeline + Owner Sunumu (2 gün)
**Context:** 00 (§3.3), 03 (§5), 01
- Schema: forms, form_submissions, pipeline_stages, applications, owner_views
- Form builder: alan listesi + özellik paneli (sayfa içi, modal değil); public `/f/[token]`
- Booking'e form bağlama (`require_form_first`)
- Pipeline sayfası: kanban (dnd-kit), stage ekle/rename, kart = aday özeti
- Aday detayı (sheet): cevaplar, ekler, geçmiş, AI özeti alanı (FAZ 6'da dolar)
- Owner sunumu `/o/[token]`: read-only, shortlist karşılaştırma kartları + approve/request-changes butonu → agent'a bildirim
**DoD:** Form dolduran aday pipeline'a düşüyor; owner linkiyle onay akışı dönüyor.

## FAZ 5 — Inbox: Gmail + Resend (2 gün)
**Context:** 02, 03 (§6), 05 (§3 kısmen)
- Settings > Integrations: Gmail OAuth connect/disconnect, durum badge
- Inngest inbox-sync: history API ile delta çekme, webhook (Pub/Sub) prod'da
- Resend outbound + react-email şablonları (davet, booking onay, hatırlatıcı)
- Inbox UI: conversation listesi (sol) + thread (sağ), property/contact auto-link (telefon/email match), okunmadı rozeti
- Reply composer (şimdilik AI'sız)
**DoD:** Gmail bağla → inbound mesaj düşüyor → property'ye linkleniyor → inbox'tan reply gidiyor. (WhatsApp bu fazda stub; FAZ 7'de.)

## FAZ 6 — AI Çekirdek: Ask + Draft + Summaries (2.5 gün)
**Context:** 05, 01 (prompt-bar)
- Embeddings pipeline + tool set (6 tool) + Home ask ekranı (streaming, kaynak kartları)
- Draft with AI (conversation inline) + ton seçici
- Applicant auto-summary + score
- Settings > AI: imza, dil, ton default'ları, kota göstergesi
- ai_threads geçmişi Home'da liste
**DoD:** "Bu ay kaç viewing var?" doğru sayıyor; draft üretiliyor ve gönderim metriği yazıyor; yeni başvuruya özet düşüyor.

## FAZ 7 — Contract Mode + WhatsApp + Hatırlatıcılar + Calendar Ay Görünümü (2.5 gün)
**Context:** 05 (§4–5), 00 (§3.5)
- Templates ayarı, contract wizard, markdown editor + versiyon, DOCX/PDF export, disclaimer akışı
- WhatsApp Cloud API: template gönderim, inbound webhook, conversation'lara birleşme
- Proaktif reminders cron + Home "Needs attention"
- Calendar ay/hafta görünümü (property filtreli), event-chip'li
**DoD:** Sözleşme taslağı üretilip export ediliyor; WhatsApp mesajı inbox'ta; hatırlatıcı kartları akıyor.

## FAZ 8 — Polish & Hardening (1.5 gün)
- Playwright smoke suite, RLS audit, rate limit'ler, error boundaries, empty state'ler
- Dark mode gözden geçirme, mobile responsive pass, PWA manifest
- Seed script (demo workspace: 4 property, booking'ler, conversations) — demo/satış için
- Performans: public sayfa Lighthouse 95+, N+1 taraması (drizzle query log)

---

## Cursor'la Çalışma Taktikleri

- **Büyük fazları böl**: Tek prompt'ta "FAZ 3'ü yap" deme; "FAZ 3, adım 2: slot engine'i TDD ile yaz" gibi 30–60 dk'lık dilimler.
- **Önce plan onayı**: Her dilimde Cursor'dan önce değişecek dosya listesi + yaklaşım; onaylamadan kodlatma.
- **Şema değişikliği protokolü**: Drizzle migration üret → diff'i gözden geçir → uygula. Cursor'a "asla mevcut migration'ı editletme, yenisini üret" kuralı rules'ta.
- **Regresyon alarmı**: Slot engine'e dokunan her prompt'ta "testleri çalıştır ve sonucu göster" zorunluluğu.
- **Context hijyeni**: Chat uzayınca yeni chat aç; önceki chat'in "neyin bittiği" özetini (2-3 madde) yeni chate taşı.
- **UI işlerinde**: Her UI promptunun sonuna ekle: "docs/01-design-system.md §9 altın kuralları ihlal etme; bittiğinde ihlal kontrolü yap."
