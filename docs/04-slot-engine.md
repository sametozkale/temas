# 04 — Slot Engine: Çok Paydaşlı Müsaitlik Kesişimi

> Ürünün en zor ve en fark yaratan parçası. `lib/slots/` altında **saf fonksiyon** olarak yazılır; IO yok, DB yok — girdi data structure, çıktı slot listesi. Bu sayede %100 unit-test edilebilir (Vitest). DB okuma/yazma Inngest fonksiyonunda.

## 1. Kural Seti (iş tanımı)

Kitaplanabilir slot = **katılımcı kümelerinin müsaitlik kesişimi**, ürün ayarlarına göre dilimlenmiş:

- Zorunlu kümeler: `agent` ve (eğer property'de current_tenant varsa) `current_tenant`. Owner `viewer_required` ise üçüncü küme.
- Bir küme "müsait" sayılır = o kümedeki katılımcılardan **en az birinin** penceresi o aralığı kapsıyorsa (birden fazla tenant/agent olabilir → küme içi VE, değil VEYA).
- Kesişim aralıkları, `slot_duration` + `buffer` ızgarasına döşenir; ızgaranın başlangıcı kesişim aralığının başlangıcıdır.
- Filtreler: `min_notice_hours` (şimdi + X saatten öncesi elenir), `max_days_ahead` (ufuk), `availability_exceptions` (block günleri çıkar, override ekle).
- Zaten `booked`/`blocked` slotlar tekrar üretilmez; status korunur.

## 2. API

```ts
// lib/slots/types.ts
export type Window = { startMin: number; endMin: number };           // gün-içi dakika ofsetleri
export type DayWindows = { date: string; windows: Window[] };        // timezone'da çözülmüş gün

export interface SlotEngineInput {
  timezone: string;                       // property.timezone
  horizonStart: Date; horizonEnd: Date;   // UTC
  slotDurationMin: number; bufferMin: number;
  participantSets: DayWindows[][];        // [agentGünleri, tenantGünleri, ownerGünleri?]
  existingBooked: { startsAt: Date; endsAt: Date }[];
  minNoticeHours: number;
  now: Date;
}
export function generateSlots(input: SlotEngineInput): { startsAt: Date; endsAt: Date }[]
```

```ts
// lib/slots/index.ts — iskelet
export function generateSlots(i: SlotEngineInput) {
  const days = eachDay(i.horizonStart, i.horizonEnd, i.timezone);
  const out: Slot[] = [];
  for (const day of days) {
    const sets = i.participantSets.map(set => windowsForDay(set, day));
    if (sets.some(s => s.length === 0)) continue;            // herhangi bir küme o gün boşsa → kesişim yok
    for (const iv of intersectAll(sets)) {                   // aralık kesişimi
      for (const s of tile(iv, i.slotDurationMin + i.bufferMin, i.slotDurationMin)) {
        if (isTooSoon(s, i.now, i.minNoticeHours)) continue;
        if (overlapsAny(s, i.existingBooked)) continue;
        out.push(toUtc(s, i.timezone));
      }
    }
  }
  return out;
}
```

### İmza gereken yardımcılar (her biri ayrı saf fonksiyon)
- `expandRRule(rrule, tz, from, to) → DayWindows[]` — rrule paketi; DST geçişlerinde **duvar saati** (wall-clock) korunur: "17:00" yaz saati değişse de 17:00'dir. Bunu sağlamak için önce gün bazında üret, sonra tz→UTC çevir.
- `applyExceptions(windows, exceptions, day)`
- `intersectAll(sets: Window[][][]) → Window[]` — önce küme içi union, sonra kümeler arası kesişim (sweep-line veya iki-pointer).
- `tile(interval, stepMin, durMin) → Slot[]` — sığmayan son parça atılır.
- `overlapsAny(slot, booked)` — buffer zaten step'e dahil; booked slotlarla çakışma kontrolü ayrıca yapılır (yeniden materyalizasyonda).

## 3. Tetikleme & Materyalizasyon (Inngest)

| Olay | İş |
|---|---|
| viewing_calendar yayınlandı / ayar değişti | `materialize-slots {calendarId}` kuyruğa |
| availability_window/exception CRUD | aynı job (debounce 2 sn) |
| Booking iptal | slot `open`'a döner |
| Gece cron (04:00) | tüm aktif takvimler için ufuk ileri kaydır + süresi geçen open slotları düşür |

Job pseudo-kodu:
1. Girdileri DB'den çek → `generateSlots()` → hedef liste.
2. `viewing_slots` ile diff: yenileri INSERT (ON CONFLICT DO NOTHING), artık üretilmeyen ve hâlâ `open` olanları DELETE/`cancelled`.
3. Kısa pencere: insert'lerde unique `(viewing_calendar_id, starts_at)` yarış koşulunu kapatır.

## 4. Public Booking Akışı

1. `GET /b/[token]` → calendar + property özeti + önümüzdeki N gün `open` slotlar (SSR, cache 60 sn).
2. `require_form_first` ise önce form adımı; submission `contact` yaratır.
3. Slot seç → ad/telefon/email → **email OTP** (6 hane, 10 dk) → booking INSERT + slot `booked` + confirmation email/WhatsApp + agent'e Inbox bildirimi + tenant'a bildirim.
4. Onay sayfasında takvime ekle (.ics) ve `cancel_token` linkli iptal butonu; iptalde slot `open`, taraflara bildirim.
5. Rate limit: IP başına 10 OTP/saat, token başına 5 booking/gün.

## 5. Test Senaryoları (Vitest — motor için zorunlu set)

- Basit kesişim: agent 09–17, tenant 17–20 → hiç slot yok (sınırda: 17:00 bitiş = 17:00 başlangıç sayılmaz mı? — karar: `[start, end)` yarı-açık aralık; dokümante et).
- Tam bindirme, kısmi bindirme, kümede 2 katılımcı (biri sabahçı biri akşamcı → union).
- Exceptions: block gün, override daraltma.
- Buffer: 30 dk slot + 15 dk buffer → adım 45 dk; artakalan 20 dk'lık parça atılır.
- DST: Europe/Istanbul kalıcı +3 (kolay); yine de 'America/New_York' ile geçiş haftası testi yaz (ileriye hazırlık).
- min_notice: şimdi+3 saat içindeki slot üretilmez.
- Re-materialization idempotent: iki kez çalıştır → aynı slot seti.
- Booked slot, pencere daraltılırsa bile korunur (✗ silinmez, `blocked` yapılır ve agent'a uyarı).

## 6. Bilinçli Basitleştirmeler (v1)

- Slot'lar tek property takvimine ait; workspace-geneli çakışma kontrolü (agent'in başka viewing'i) v1'de **uyarı** olarak gösterilir, engellemez.
- Multi-timezone gösterimi: public sayfa visitor timezone'unu algılar ama slotlar property timezone'unda etiketlenir (karışıklığı önlemek için her iki etiket birden gösterilir).
