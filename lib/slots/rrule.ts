import { RRule, rrulestr } from "rrule";

import { eachDay } from "./time";
import type { DayException, DayWindows, ExpandRRuleInput } from "./types";

function weekdayMon0(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return js === 0 ? 6 : js - 1;
}

function parseRule(rrule: string): RRule {
  const body = rrule.trim().startsWith("DTSTART")
    ? rrule
    : rrule.toUpperCase().includes("FREQ=")
      ? rrule
      : `FREQ=WEEKLY;${rrule}`;
  return rrulestr(body, {
    dtstart: new Date(Date.UTC(2020, 0, 6, 12, 0, 0)), // Monday
  }) as RRule;
}

function weekdayFromRRule(value: number | { weekday: number }): number {
  return typeof value === "number" ? value : value.weekday;
}

function matchesDate(rule: RRule, ymd: string): boolean {
  const wd = weekdayMon0(ymd);
  const freq = rule.options.freq;
  const bywd = rule.options.byweekday;

  if (bywd && bywd.length > 0) {
    const days = bywd.map(weekdayFromRRule);
    if (!days.includes(wd)) return false;
  } else if (freq === RRule.WEEKLY) {
    const startWd = weekdayFromRRule(
      (rule.options.byweekday?.[0] as
        number | { weekday: number } | undefined) ?? weekdayMon0("2020-01-06"),
    );
    if (wd !== startWd) return false;
  }

  if (freq === RRule.DAILY || freq === RRule.WEEKLY) return true;

  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  const stamp = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return rule.between(stamp, stamp, true).length > 0;
}

/**
 * Expand an rrule into per-day windows. Civil dates are produced first so
 * "17:00" stays 17:00 across DST (docs/04 §2).
 */
export function expandRRule(
  input: ExpandRRuleInput,
  from: Date,
  to: Date,
): DayWindows[] {
  const rule = parseRule(input.rrule);
  const days = eachDay(from, to, input.timezone);
  const out: DayWindows[] = [];
  for (const date of days) {
    if (input.effectiveFrom && date < input.effectiveFrom) continue;
    if (input.effectiveUntil && date > input.effectiveUntil) continue;
    if (!matchesDate(rule, date)) continue;
    if (input.endMin <= input.startMin) continue;
    out.push({
      date,
      windows: [{ startMin: input.startMin, endMin: input.endMin }],
    });
  }
  return out;
}

export function applyExceptions(
  days: DayWindows[],
  exceptions: DayException[],
): DayWindows[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  for (const ex of exceptions) {
    if (ex.kind === "block") {
      byDate.delete(ex.date);
      continue;
    }
    if (ex.startMin == null || ex.endMin == null || ex.endMin <= ex.startMin) {
      continue;
    }
    byDate.set(ex.date, {
      date: ex.date,
      windows: [{ startMin: ex.startMin, endMin: ex.endMin }],
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
