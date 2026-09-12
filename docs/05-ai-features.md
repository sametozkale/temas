# 05 — AI Features Spec

> Stack: Vercel AI SDK (`streamText`, `generateObject`), Anthropic (metin kalitesi kritik: draft + contract), OpenAI embeddings + pgvector (RAG). Tüm AI çağrıları `lib/ai/` altında; prompt'lar `lib/ai/prompts/*.md` olarak versiyonlanır — koda gömülü prompt YOK.

## 1. Ürün İçi AI Yüzeyleri

| Yüzey | Tetik | Model görevi | Çıktı |
|---|---|---|---|
| Home prompt bar | Kullanıcı sorusu | RAG + tools ile portföy cevabı | Streaming metin + kaynak kartları (deep-link) |
| Inbox "Draft with AI" | Buton (conversation'da) | Thread özeti + context'ten taslak | Inline editable taslak (TR/EN, 3 ton: formal/samimi/kısa) |
| Akıllı hatırlatıcılar | Inngest cron (2 saatte bir) | Sinyal taraması → proaktif öneri | Home feed kartı + email digest |
| Contract mode | "Create contract" | Template + parametrelerden sözleşme taslağı | Editörde markdown → DOCX/PDF |
| Applicant summary | Form submission düşünce | Aday özeti + risk notu + 1–5 skor önerisi | application.ai_summary + score |
| Conversation auto-link | Inbound mesaj | Mesajı contact+property ile eşleştir | conversation.property_id |

## 2. Home Ask — Mimari

1. Soru → `hybrid retrieval`: (a) structured tool calls (aşağıdaki tool set), (b) pgvector semantic search (`embeddings` tablosu, cosine < 0.25 eşiği, workspace filtresi zorunlu).
2. Tool set (AI SDK `tools`, her biri server-side zod-schemalı fonksiyon):
   - `searchProperties(query, filters)` — başlık/adres/durum/fiyat
   - `getPropertyDetail(id)` — inventory, people, docs meta
   - `listViewings(propertyId?, from, to, status)` — takvim sorguları
   - `listApplications(propertyId, stage?)` — pipeline soruları
   - `searchConversations(query, propertyId?)` — inbox araması (özetlerden)
   - `getReminders(status)` 
3. System prompt ilkeleri: sadece workspace verisiyle cevapla; bilmediğinde söyle; rakam verirken kaynağını kart olarak ekle; TR yanıt default.
4. Yanıt UI: streaming metin + altında kaynak chip'leri (property/conversation deep-link). Konuşma `ai_threads`'e kaydedilir.
5. **Guardrail**: AI asla booking oluşturmaz/silmez/iptal etmez — salt-okur + öneri. Yazma işlemleri (ileride "şu slota randevu oluştur") onaylı tool-call akışıyla gelir; v1'de kapalı.

## 3. Draft with AI — Inbox

- Context paketi: son 12 mesaj + conversation.ai_summary + property özeti + contact adı + agent imza bloğu (Settings > AI).
- Prompt girdisi `generateObject` ile `{ body, detectedIntent, suggestedFollowUpDate? }` — intent "viewing_request" ise taslağa otomatik booking linki eklenir.
- Kullanım metriği: gönderilen taslak ile AI çıktısının benzerliği (diff ratio) `ai_drafts.status='sent'` güncellenirken hesaplanır → kabul oranı metriği.

## 4. Akıllı Hatırlatıcılar (proaktif)

Sinyaller (hepsi deterministik ön-filtre, AI sadece mesajı yazar):
- Viewing'den 24 saat geçmiş, prospect'ten ses yok → follow-up önerisi + hazır taslak
- Booking'e 2 saat kala taraflara hatırlatma (deterministik, AI'sız da gönderilir)
- 7 gündür yanıtsız inbound mesaj
- Pipeline'da 5+ gün aynı aşamada bekleyen aday
- "Rented" olmuş property'de depozito alanı boş → veri tamamlama önerisi
- Çıktı: `reminders` tablosuna yazılır, Home'da "Needs attention" bölümü + günlük email digest (kapatılabilir).

## 5. Contract Mode

1. Girdi: template (Settings > Templates, markdown + `{{variable}}`), property, application (taraflar), parametre formu (bedel, depozito, başlangıç/bitiş, artış oranı, özel maddeler).
2. İki aşamalı üretim: (a) `generateObject` ile tüm `{{variables}}` çözülür ve eksik/çelişkili alanlar raporlanır; (b) `streamText` ile final sözleşme taslağı markdown üretilir.
3. Editör: markdown editor (basit textarea + preview yeterli), versiyonlama contracts tablosunda.
4. Export: DOCX (docx npm) + PDF (pdfmake, Playwright'sız). Files sekmesine kaydedilir.
5. Zorunlu UI: her üretimde disclaimer kartı — "Bu taslak hukuki tavsiye değildir; kullanmadan önce hukukçuya onaylatın." + `disclaimer_acknowledged` checkbox olmadan export butonu disabled.
6. v1'de ÜCRETSİZ kapsam: TR kira sözleşmesi + depozito tutanağı + tahliye taahhütnamesi şablonları (seed data; içerik placeholder, agent kendi şablonunu yükleyebilir).

## 6. Embedding Pipeline (Inngest)

- Tetikleyiciler: property create/update, document text extract (v1: sadece manuel notlar + AI summaries; OCR ertelendi), conversation.ai_summary güncellemesi, form submission.
- Chunk stratejisi: property → 1 chunk (yapılandırılmış özet metin); conversation summary → 1 chunk; document → 500 token overlap'li.
- Silme: entity silinince embedding'ler cascade.

## 7. Maliyet & Limitler

- Plan bazlı kota: Free 100 AI mesajı/ay, Pro 2000 (kayıt: ai_messages sayımı).
- Model yönlendirme: kısa sınıflandırma (auto-link, intent) → haiku sınıfı; draft/contract/ask → sonnet sınıfı. Provider config tek dosyada (`lib/ai/models.ts`).

## 8. Prompt Dosyaları (repo'da oluşturulacak)

```
lib/ai/prompts/ask-system.md        # tool kullanım kuralları, kaynak gösterme zorunluluğu
lib/ai/prompts/draft.md             # ton matrisi, imza, booking-link enjeksiyonu
lib/ai/prompts/contract-system.md   # variable resolution, disclaimer, TR hukuk terminolojisi
lib/ai/prompts/applicant-summary.md # skor rubric'i (ödeme gücü, zamanlama, referans, uyum)
lib/ai/prompts/reminder-copy.md     # kısa, eyleme geçirilebilir tek cümle + CTA
```
