/**
 * Slot engine types (docs/04). Pure data — no Date.now(), no IO.
 *
 * Intervals are half-open `[start, end)`: a 17:00 end does not cover a 17:00 start.
 */

/** Minute offsets from local midnight. */
export type Window = { startMin: number; endMin: number };

/** Windows for one civil date (`YYYY-MM-DD`) in the property timezone. */
export type DayWindows = { date: string; windows: Window[] };

export type UtcInterval = { startsAt: Date; endsAt: Date };

export type SlotEngineInput = {
  timezone: string;
  horizonStart: Date;
  horizonEnd: Date;
  slotDurationMin: number;
  bufferMin: number;
  /**
   * Required participant sets, e.g. `[agentDays, tenantDays, ownerDays?]`.
   * Inside a set, windows are OR'd (union); across sets they are AND'd.
   */
  participantSets: DayWindows[][];
  existingBooked: UtcInterval[];
  minNoticeHours: number;
  now: Date;
};

export type GeneratedSlot = UtcInterval;

export type SlotStatus = "open" | "booked" | "blocked" | "cancelled";

export type ExistingSlot = {
  id: string;
  startsAt: Date;
  status: SlotStatus;
};

export type SlotDiff = {
  insert: GeneratedSlot[];
  /** Open slots that are no longer generated. */
  cancelIds: string[];
  /** Booked slots whose window disappeared — keep the row, mark blocked. */
  blockIds: string[];
};

export type ExpandRRuleInput = {
  rrule: string;
  timezone: string;
  startMin: number;
  endMin: number;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
};

export type DayException = {
  date: string;
  kind: "block" | "override";
  startMin?: number | null;
  endMin?: number | null;
};
