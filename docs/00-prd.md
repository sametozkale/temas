# PRD — AI-Native Property Management Platform for Real Estate Agents

> Codename: **Havn** (yer tutucu). Bu dosya ürünün tek doğruluk kaynağıdır (single source of truth). Cursor'a her fazda bu dosya context olarak verilir.

## 1. Vizyon

Emlakçıların (real estate agents) kiralama odaklı tüm operasyonunu — portföy yönetimi, görüşme (viewing) planlama, aday pipeline'ı, iletişim ve sözleşme — tek bir AI-native workspace'te yürütmesini sağlayan platform.

**Ana ICP:** Bağımsız emlakçılar ve küçük emlak ofisleri (1–10 kişi), kiralama (rental) ağırlıklı portföy.

**Fark yaratma tezi:** Mevcut property management yazılımları "kayıt sistemi"dir (system of record). Bu ürün "eylem sistemi"dir (system of action): Çok paydaşlı müsaitlik kesişimiyle otomatik booking, AI ile tek tuşla iletişim taslakları, AI sözleşme modu ve portföy genelinde doğal dil sorgulama.

## 2. Persona & Roller

| Rol | Tanım | Erişim |
|---|---|---|
| Agent (Admin) | Emlakçı, workspace sahibi | Her şey |
| Teammate / Assistant | Ofis çalışanı | Workspace içi, agent'in yetkilendirdiği ölçüde |
| Owner (Ev sahibi) | Mülk sahibi | Kendi property'sinin özeti, pipeline görünümü, dokümanlar |
| Current Tenant (Mevcut kiracı) | Mülkte oturan kişi | Kendi müsaitlik (availability) girişi, viewing bildirimleri |
| Prospect (Aday kiracı) | Public link/form üzerinden gelen kişi | Hesap opsiyonel: form doldurma + slot booking (OTP doğrulamalı) |

## 3. Temel Akışlar

### 3.1 Workspace & Property
1. Agent workspace oluşturur (ad, logo, dil/temel ayarlar).
2. Workspace altında sınırsız property: **ev, ofis, mağaza, depo, arsa** vb. tipler.
3. Property detay ekranı sekmeleri:
   - Overview (fotoğraflar, durum, temel bilgiler, fiyat, m², oda, adres/harita)
   - Inventory (demirbaş listesi: kalem, adet, durum notu, fotoğraf)
   - People (owner, current tenant, linked prospects)
   - Files (sözleşmeler, tapu/fatura görüntüleri, DASK vb. — Supabase Storage)
   - Viewings (takvim + booking geçmişi)
   - Applications (pipeline'a düşen adaylar)
   - Activity (audit log)

### 3.2 Çok Paydaşlı Görüşme Takvimi (çekirdek fark)
1. Agent, property için bir **viewing calendar** açar ve public booking linki üretir.
2. Agent kendi müsaitlik pencerelerini girer (recurring: "Hafta içi 10:00–18:00").
3. Mevcut kiracı varsa, agent kiracıyı takvime davet eder; kiracı kendi müsaitlik pencerelerini girer ("Salı/Perşembe 17:00–20:00").
4. **Slot motoru** iki pencere kümesinin kesişimini hesaplar, booking süresi (ör. 30 dk) + buffer (ör. 15 dk) ile kitaplanabilir slotlar üretir.
5. Prospect public linkte sadece bu kesişim slotlarını görür, seçer, ad/telefon/email girer (email OTP ile doğrulanır) → booking oluşur.
6. Booking sonrası taraflara onay + hatırlatıcı (email/WhatsApp), agent'in calendar görünümüne işlenir. İptal/değişiklik iki yönlü.
7. Opsiyonel: Owner da pencere girebilir → kesişim 3 kümede hesaplanır (owner onayı gereken mülklerde).

### 3.3 Form Builder & Aday Pipeline
1. Agent property'ye bağlı form oluşturur (sürükle-bırak değil; önceden tanımlı alan seti + custom sorular: gelir, çalışma durumu, taşınma tarihi, evcil hayvan, referans, belge yükleme).
2. Form public link ile paylaşılır; public booking sayfasına da gömülebilir ("Bu evi görmek için önce formu doldur").
3. Dolduran her aday pipeline'a **New** aşamasında düşer.
4. Pipeline aşamaları (özelleştirilebilir): New → Reviewing → Viewing Scheduled → Viewed → Shortlisted → Approved by Owner → Contract → Rented / Rejected.
5. **Owner'a sunum modu:** Salt-okunur, paylaşılabilir link; shortlist edilmiş adayların karşılaştırmalı kart görünümü (score, özet, belgeler). Owner tek tıkla "Approve / Request changes" der, agent'a bildirim düşer.

### 3.4 Unified Inbox
1. Agent Gmail/Outlook (OAuth) ve WhatsApp Business Cloud API'yi Settings > Integrations'tan bağlar.
2. Tüm konuşmalar tek Inbox'ta; her conversation otomatik olarak ilgili property ve contact ile eşleştirilir (telefon/email eşleşmesi).
3. AI satır içi yardım:
   - **Draft with AI** — conversation geçmişi + property context'inden tek tuşla taslak (TR/EN ton seçimi)
   - Akıllı hatırlatıcılar ("Dün viewing sonrası Ahmet Bey'den dönüş almadın; kira bedeli pazarlığı yarım kaldı")
   - Conversation özeti (uzun thread'lerde)

### 3.5 AI Contract Mode
1. "Create contract" modu: template seç (kiralama sözleşmesi TR), taraflar property/people'dan otomatik çekilir, parametreler form alanıyla doldurulur (bedel, depozito, süre, artış oranı).
2. AI taslak üretir → agent editörde düzenler → DOCX/PDF export → Files'a kaydet → e-imza entegrasyonu (faz 2; ilk fazda export + manuel).
3. Sistem dislaimer'ı: "Hukuki tavsiye değildir" her çıktıda.

### 3.6 Home — AI Ask Anything
1. Home ekranında Granola tarzı alt-orta prompt input.
2. Sorgular tüm portföy verisi + inbox + takvim üzerinde RAG: "Eylül'de kaç viewing var?", "Depozitosu eksik olan mülkler?", "Kadıköy'deki ofis için son konuşmada ne konuşuldu?"
3. Yanıtlar kart formatında, kaynak property/conversation'a deep-link'li.

## 4. Navigasyon (Granola pattern)

Sidebar (slim, icon + label):
- **Home** — Coming up (yaklaşan viewing'ler), AI aktivite özeti, prompt input
- **Inbox** — birleşik email + WhatsApp
- **Calendar** — workspace geneli tüm viewing'ler (ay/hafta/görünüm; property filtresi)
- **Properties** — liste/grid, durum filtresi, arama
- **Settings** — General, Members, Integrations (Gmail/Outlook/WhatsApp), Notifications, AI preferences, Templates (form + sözleşme), Billing, Danger zone

Kural: Settings dışında üstte başka ikincil menü yok; Granola gibi her şey tek yerde.

## 5. Davet & Onboarding Tasarımı (en az sürtünme)

| Hedef | Mekanizma |
|---|---|
| Teammate | Email invite → tam hesap |
| Owner / Current Tenant | **Magic link** davet (şifresiz, Supabase OTP). İlk girişte yalnızca ilgili property görünür. Tenant akışı: hoş geldin → takvime pencere gir (3 adımlı wizard) → bitti |
| Prospect | Hesap yok. Public linkler: booking + form. Email OTP ile kimlik doğrulama, link kalıcı kişisel sayfaya döner |
| WhatsApp ile davet | Agent, davet linkini üründen WhatsApp şablonuyla gönderebilir |

## 6. Kapsam Dışı (v1)

- Ödeme/kira tahsilatı, muhasebe
- e-imza entegrasyonu (v1: export only)
- MLS/portallara ilan senkronizasyonu
- Mobil native app (responsive web + PWA manifest yeterli)
- Çoklu dil: v1 = TR UI, i18n altyapısı hazır (EN ikinci)

## 7. Başarı Metrikleri (düşün, kodlamaya şimdiden event altyapısı koy)

- Activation: ilk property oluşturma < 5 dk; tenant davet kabul oranı
- Booking dönüşümü: public link görüntüleme → booking
- AI kabul oranı: draft'lerin düzenlenmeden gönderilme oranı
- Zaman kazancı: viewing başına organize süresi (hedef: <%70 azalma)

## 8. Durum Modeli (Property lifecycle)

`draft → active (for rent) → viewing_in_progress → application_review → contract_pending → rented → archived`

Her geçiş Activity log'a yazılır; Home'daki AI summary bu akıştan beslenir.
