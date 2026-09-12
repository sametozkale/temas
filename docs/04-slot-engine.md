# 04 — Slot Engine: Multi-Party Availability Intersection

> The hardest and most differentiating part of the product. Written as **pure functions** under `lib/slots/`; no IO, no DB — input is a data structure, output is a slot list. This makes it 100% unit-testable (Vitest). DB reads/writes happen in the Inngest function.

## 1. Rule Set (business definition)

Bookable slot = **the intersection of the participant sets' availability**, tiled according to the product settings:

- Mandatory sets: `agent` and (if the property has a current_tenant) `current_tenant`. If the owner is `viewer_required`, a third set.
- A set counts as "available" when **at least one** participant in that set has a window covering the interval (there may be several tenants/agents → OR inside a set, not AND).
- Intersection intervals are tiled onto a `slot_duration` + `buffer` grid; the grid starts at the beginning of the intersection interval.
- Filters: `min_notice_hours` (anything before now + X hours is dropped), `max_days_ahead` (horizon), `availability_exceptions` (remove blocked days, add overrides).
- Slots that are already `booked`/`blocked` are not regenerated; their status is preserved.

## 2. API

```ts
// lib/slots/types.ts
export type Window = { startMin: number; endMin: number };           // minute offsets within the day
export type DayWindows = { date: string; windows: Window[] };        // day resolved in the timezone

export interface SlotEngineInput {
  timezone: string;                       // property.timezone
  horizonStart: Date; horizonEnd: Date;   // UTC
  slotDurationMin: number; bufferMin: number;
  participantSets: DayWindows[][];        // [agentDays, tenantDays, ownerDays?]
  existingBooked: { startsAt: Date; endsAt: Date }[];
  minNoticeHours: number;
  now: Date;
}
export function generateSlots(input: SlotEngineInput): { startsAt: Date; endsAt: Date }[]
```

```ts
// lib/slots/index.ts — skeleton
export function generateSlots(i: SlotEngineInput) {
  const days = eachDay(i.horizonStart, i.horizonEnd, i.timezone);
  const out: Slot[] = [];
  for (const day of days) {
    const sets = i.participantSets.map(set => windowsForDay(set, day));
    if (sets.some(s => s.length === 0)) continue;            // any empty set that day → no intersection
    for (const iv of intersectAll(sets)) {                   // interval intersection
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

### Helpers that need a signature (each a separate pure function)
- `expandRRule(rrule, tz, from, to) → DayWindows[]` — the rrule package; **wall-clock** time is preserved across DST transitions: "17:00" stays 17:00 even when daylight saving changes. To guarantee this, generate per day first, then convert tz→UTC.
- `applyExceptions(windows, exceptions, day)`
- `intersectAll(sets: Window[][][]) → Window[]` — union inside each set first, then intersection across sets (sweep-line or two-pointer).
- `tile(interval, stepMin, durMin) → Slot[]` — the trailing piece that does not fit is dropped.
- `overlapsAny(slot, booked)` — the buffer is already part of the step; overlap with booked slots is checked separately (on re-materialization).

## 3. Triggers & Materialization (Inngest)

| Event | Job |
|---|---|
| viewing_calendar published / settings changed | enqueue `materialize-slots {calendarId}` |
| availability_window/exception CRUD | same job (debounce 2 s) |
| Booking cancelled | slot returns to `open` |
| Nightly cron (04:00) | for every active calendar: move the horizon forward + drop expired open slots |

Job pseudo-code:
1. Load inputs from the DB → `generateSlots()` → target list.
2. Diff against `viewing_slots`: INSERT new ones (ON CONFLICT DO NOTHING); slots that are no longer generated and still `open` → DELETE / `cancelled`.
3. Short window: the unique `(viewing_calendar_id, starts_at)` constraint closes the race on inserts.

## 4. Public Booking Flow

1. `GET /b/[token]` → calendar + property summary + `open` slots for the next N days (SSR, 60 s cache).
2. If `require_form_first`, the form step comes first; the submission creates a `contact`.
3. Pick a slot → name/phone/email → **email OTP** (6 digits, 10 min) → booking INSERT + slot `booked` + confirmation email/WhatsApp + Inbox notification to the agent + notification to the tenant.
4. Confirmation page: add to calendar (.ics) and a cancel button with the `cancel_token` link; on cancellation the slot becomes `open` and all parties are notified.
5. Rate limits: 10 OTPs per IP per hour, 5 bookings per token per day.

## 5. Test Scenarios (Vitest — mandatory set for the engine)

- Simple intersection: agent 09–17, tenant 17–20 → no slot at all (boundary: does a 17:00 end count as a 17:00 start? — decision: `[start, end)` half-open interval; document it).
- Full overlap, partial overlap, 2 participants in a set (one mornings, one evenings → union).
- Exceptions: blocked day, narrowing override.
- Buffer: 30 min slot + 15 min buffer → 45 min step; a leftover 20 min piece is dropped.
- DST: Europe/Istanbul is a permanent +3 (easy); still write a transition-week test with 'America/New_York' (future-proofing).
- min_notice: no slot is generated within now+3 hours.
- Re-materialization is idempotent: run twice → the same slot set.
- A booked slot is preserved even if the window is narrowed (✗ not deleted; set to `blocked` with a warning to the agent).

## 6. Deliberate Simplifications (v1)

- Slots belong to a single property calendar; workspace-wide conflict checking (the agent's other viewings) is shown as a **warning** in v1, not a block.
- Multi-timezone display: the public page detects the visitor's timezone but slots are labelled in the property timezone (both labels are shown together to avoid confusion).
