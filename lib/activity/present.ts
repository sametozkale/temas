import type { useTranslations } from "next-intl";

import { formatDate } from "@/lib/format";

export type ActivityRow = {
  id: string;
  action: string;
  data: unknown;
  createdAt: Date;
  actorName: string | null;
  actorAvatarUrl: string | null;
};

type TActivity = ReturnType<typeof useTranslations<"properties.activity">>;
type TStatus = ReturnType<typeof useTranslations<"properties.status">>;
type TRel = ReturnType<typeof useTranslations<"properties.people.relations">>;

export function formatActivityCopy(
  row: Pick<ActivityRow, "action" | "data">,
  t: TActivity,
  tStatus: TStatus,
  tRel: TRel,
) {
  const data = (row.data ?? {}) as Record<string, unknown>;
  const vars: Record<string, string | number | Date> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string" || typeof v === "number" || v instanceof Date) {
      vars[k] = v;
    }
  }
  if (typeof data.from === "string") {
    try {
      vars.from = tStatus(data.from);
    } catch {
      vars.from = data.from;
    }
  }
  if (typeof data.to === "string") {
    try {
      vars.to = tStatus(data.to);
    } catch {
      vars.to = data.to;
    }
  }
  if (typeof data.relation === "string") {
    try {
      vars.relation = tRel(data.relation);
    } catch {
      vars.relation = data.relation;
    }
  }
  const actionKey = `actions.${row.action}`;
  if (t.has(actionKey)) {
    return t(actionKey, vars);
  }
  return t("actions.unknown", { action: row.action });
}

function dayKeyInTimezone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function groupActivityByDay(
  rows: ActivityRow[],
  timeZone: string,
  labels: { today: string; yesterday: string },
  now = new Date(),
) {
  const todayKey = dayKeyInTimezone(now, timeZone);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dayKeyInTimezone(yesterday, timeZone);

  const groups = new Map<
    string,
    { label: string; sortKey: string; rows: ActivityRow[] }
  >();

  for (const row of rows) {
    const key = dayKeyInTimezone(row.createdAt, timeZone);
    let label = formatDate(row.createdAt, { dateStyle: "long" }, timeZone);
    if (key === todayKey) label = labels.today;
    else if (key === yesterdayKey) label = labels.yesterday;

    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(key, { label, sortKey: key, rows: [row] });
    }
  }

  return [...groups.values()].sort((a, b) =>
    b.sortKey.localeCompare(a.sortKey),
  );
}
