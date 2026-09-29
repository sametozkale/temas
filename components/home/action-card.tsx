"use client";

import { getToolName, type ToolUIPart } from "ai";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import {
  Alert02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Copy01Icon,
  Icon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { ActionOutcome } from "@/lib/ai/actions/run";
import type { AskActionTargets } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type Phase = "pending" | "running" | "done" | "cancelled" | "failed" | "expired";

type Row = {
  key: string;
  label: string;
  value: string;
  before?: string | null;
  /** Secondary text after the value, e.g. the address after a recipient name. */
  detail?: string;
};

/** Free-text inputs shown as a block under the fields, not squeezed into a row. */
const PROSE_KEYS = new Set(["body", "bodyMd", "description", "note", "reason"]);
const PROSE_MIN_LENGTH = 60;
/** Longer blocks start collapsed. */
const PROSE_CLAMP_LINES = 8;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
/** A stored code such as `high` or `current_tenant`, not a sentence or an email. */
const CODE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

function labelCase(value: string): string {
  if (!CODE.test(value)) return value;
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toLocaleUpperCase("en-US") + words.slice(1);
}

/** Input keys the card never shows: ids and payloads with their own view. */
const HIDDEN_KEYS = new Set(["imageUrls", "fields", "days", "schema"]);

/** Postgres jsonb reorders object keys, so stored inputs come back shuffled. */
const ROW_ORDER = [
  "property", "task", "member", "invite", "conversation", "viewing", "contract",
  "applicant", "stage", "person", "item", "photo", "document", "template",
  "title", "name", "fullName", "type", "status", "priority", "role", "relation",
  "email", "phone", "to", "toName", "subject", "body", "bodyMd",
  "addressLine", "district", "city", "country",
  "rentAmount", "depositAmount", "duesAmount", "summerUtilitiesAmount",
  "winterUtilitiesAmount", "currency",
  "areaM2", "rooms", "bedrooms", "bathrooms", "floor", "totalFloors",
  "yearBuilt", "condition", "availableFrom", "features",
  "assignedUserId", "assigneeId", "assignee", "startsAt", "time", "slot",
  "description", "note", "reason", "sourceUrl", "url", "missing",
];

function rowRank(key: string) {
  const bare = key.replace(/^[tfd]-/, "");
  const index = ROW_ORDER.indexOf(bare);
  return index === -1 ? ROW_ORDER.indexOf("description") - 0.5 : index;
}

const WEEK_ORDER = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

/** Listing fields a new property should have; the confirm card names the gaps. */
const LISTING_KEY_FIELDS = ["rentAmount", "addressLine", "city", "areaM2", "bedrooms"];

function phaseOf(part: ToolUIPart, live: boolean): Phase {
  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return live ? "running" : "expired";
    case "approval-requested":
      return live ? "pending" : "expired";
    case "approval-responded":
      if (!part.approval.approved) return "cancelled";
      return live ? "running" : "expired";
    case "output-denied":
      return "cancelled";
    case "output-error":
      return part.errorText === "expired" ? "expired" : "failed";
    case "output-available": {
      const out = part.output as ActionOutcome | undefined;
      return out && out.ok === false ? "failed" : "done";
    }
  }
}

export function ActionCard({
  part,
  targets = [],
  live,
  onRespond,
}: {
  part: ToolUIPart;
  /** Server-resolved names of the records this call points at. */
  targets?: AskActionTargets["rows"];
  /** False once the chat has moved on or the page was reloaded. */
  live: boolean;
  onRespond: (approvalId: string, approved: boolean) => void;
}) {
  const t = useTranslations("home.ask.actions");
  const weekdays = useTranslations("viewings.weekdays");
  const format = useFormatter();
  const name = getToolName(part);
  const phase = phaseOf(part, live);
  const [answered, setAnswered] = React.useState(false);
  const output =
    part.state === "output-available"
      ? (part.output as ActionOutcome | undefined)
      : undefined;
  const input = (part.input ?? {}) as Record<string, unknown>;

  const title = t.has(`tools.${name}`) ? t(`tools.${name}`) : name;

  function label(key: string) {
    return t.has(`fields.${key}`) ? t(`fields.${key}`) : null;
  }

  function show(value: unknown): string | null {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "boolean") return value ? t("yes") : t("no");
    if (typeof value === "number") return String(value);
    if (typeof value === "string") {
      if (UUID.test(value)) return null;
      if (ISO.test(value)) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          return format.dateTime(date, { dateStyle: "medium", timeStyle: "short" });
        }
      }
      return labelCase(value);
    }
    if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
      const shown = value.map(labelCase);
      return shown.length ? shown.join(", ") : null;
    }
    return null;
  }

  function named(raw: unknown): string | null {
    if (typeof raw === "string" && UUID.test(raw)) {
      return targets.find((target) => target.id === raw)?.value ?? null;
    }
    return show(raw);
  }

  function inputRows(): Row[] {
    const rows: Row[] = [];
    for (const target of targets) {
      const l = label(target.key);
      if (l) rows.push({ key: `t-${target.key}`, label: l, value: target.value });
    }
    const push = (key: string, raw: unknown) => {
      if (HIDDEN_KEYS.has(key)) return;
      const l = label(key);
      const v = show(raw);
      if (l && v) rows.push({ key, label: l, value: v });
    };
    for (const [key, raw] of Object.entries(input)) push(key, raw);
    if (input.fields && typeof input.fields === "object") {
      for (const [key, raw] of Object.entries(input.fields as Record<string, unknown>)) {
        const l = label(key);
        const v = show(raw) ?? (raw === "" ? t("empty") : null);
        if (l && v) rows.push({ key: `f-${key}`, label: l, value: v });
      }
    }
    if (Array.isArray(input.days)) {
      const days = [...(input.days as { weekday?: string; start?: string; end?: string }[])].sort(
        (a, b) => WEEK_ORDER.indexOf(a.weekday ?? "") - WEEK_ORDER.indexOf(b.weekday ?? ""),
      );
      for (const day of days) {
        if (day.weekday) {
          const weekday = weekdays.has(day.weekday) ? weekdays(day.weekday) : day.weekday;
          rows.push({
            key: `d-${day.weekday}`,
            label: weekday,
            value: `${day.start}–${day.end}`,
          });
        }
      }
    }
    if (name === "createProperty" && phase !== "done") {
      const missing = LISTING_KEY_FIELDS.filter((key) => !show(input[key])).flatMap((key) => {
        const l = label(key);
        return l ? [l] : [];
      });
      if (missing.length > 0) {
        rows.push({ key: "missing", label: t("fields.missing"), value: missing.join(", ") });
      }
    }
    const to = rows.find((row) => row.key === "to");
    const toName = rows.find((row) => row.key === "toName");
    if (to && toName) {
      to.detail = to.value;
      to.value = toName.value;
      rows.splice(rows.indexOf(toName), 1);
    }
    const days = rows.filter((row) => row.key.startsWith("d-"));
    const gaps = rows.filter((row) => row.key === "missing");
    const rest = rows
      .filter((row) => !row.key.startsWith("d-") && row.key !== "missing")
      .sort((a, b) => rowRank(a.key) - rowRank(b.key));
    return [...rest, ...days, ...gaps];
  }

  function isProse(row: Row) {
    return (
      row.before === undefined &&
      PROSE_KEYS.has(row.key) &&
      (row.value.length >= PROSE_MIN_LENGTH || row.value.includes("\n"))
    );
  }

  function changeRows(): Row[] {
    if (!output?.ok || !output.changes) return [];
    return output.changes.flatMap((change) => {
      const l =
        label(change.field) ??
        change.field.replaceAll(".", " · ").replaceAll("_", " ");
      return [
        {
          key: change.field,
          label: l,
          before: named(change.before) ?? t("empty"),
          value: named(change.after) ?? t("empty"),
        },
      ];
    });
  }

  const allRows = phase === "done" && changeRows().length > 0 ? changeRows() : inputRows();
  const rows = allRows.filter((row) => !isProse(row));
  const prose = allRows.filter(isProse);
  const hasSubject = rows.some((row) => row.key === "subject");
  const images =
    phase !== "done" && Array.isArray(input.imageUrls)
      ? (input.imageUrls as unknown[]).filter((u): u is string => typeof u === "string")
      : [];

  const errorKey =
    phase === "failed"
      ? output && output.ok === false
        ? output.error
        : part.state === "output-error"
          ? "failed"
          : "unknown"
      : null;

  const status = {
    pending: {
      icon: Clock01Icon,
      tone: "bg-warning-soft text-warning",
      text: t("state_pending"),
    },
    running: {
      icon: Clock01Icon,
      tone: "bg-muted text-muted-foreground",
      text: t("state_running"),
    },
    done: {
      icon: CheckmarkCircle02Icon,
      tone: "bg-success-soft text-success",
      text: t("state_done"),
    },
    cancelled: {
      icon: Cancel01Icon,
      tone: "bg-muted text-muted-foreground",
      text: t("state_cancelled"),
    },
    failed: {
      icon: Alert02Icon,
      tone: "bg-destructive/10 text-destructive",
      text: t("state_failed"),
    },
    expired: {
      icon: Clock01Icon,
      tone: "bg-muted text-muted-foreground",
      text: t("state_expired"),
    },
  }[phase];

  const errorText = errorKey
    ? t.has(`errors.${errorKey}`)
      ? t(`errors.${errorKey}`)
      : t("errors.unknown")
    : null;

  const changed =
    phase === "done" && output?.ok && output.changes?.length
      ? output.changes.map((change) => {
          const name = label(change.field) ?? change.field;
          return name.charAt(0).toLocaleLowerCase("en-US") + name.slice(1);
        })
      : [];
  const changedList = format.list(changed, { type: "conjunction" });

  const headline =
    phase === "done" && output?.ok
      ? changed.length > 0
        ? output.hrefLabel
          ? t("updated_on", { fields: changedList, name: output.hrefLabel })
          : t("updated", { fields: changedList })
        : output.summary
      : phase === "failed" && errorText
        ? errorText
        : phase === "cancelled"
          ? t("cancelled_hint")
          : phase === "expired"
            ? t("expired_hint")
            : phase === "running"
              ? t("purpose_running")
              : t("purpose_pending");

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success(t("copied"));
  }

  const approvalId =
    part.state === "approval-requested" ? part.approval.id : null;

  const hasBody =
    rows.length > 0 ||
    prose.length > 0 ||
    images.length > 0 ||
    (phase === "failed" &&
      Boolean(output && output.ok === false && output.fieldErrors)) ||
    (phase === "done" &&
      output?.ok &&
      typeof output.data?.skipped === "number" &&
      output.data.skipped > 0);
  const hasFooter =
    (phase === "pending" && Boolean(approvalId)) ||
    (phase === "done" && output?.ok && Boolean(output.href || output.url));

  return (
    <div
      role="group"
      aria-label={`${title}. ${headline}`}
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-xl border bg-card text-sm wrap-anywhere",
        phase === "pending" && "border-warning/40",
        phase === "failed" && "border-destructive/30",
        phase !== "pending" && phase !== "failed" && "border-foreground/10",
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="mt-0.5 font-medium leading-5 wrap-anywhere">{headline}</p>
        </div>
        <span
          className={cn(
            "mt-0.5 flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs",
            status.tone,
          )}
        >
          <Icon
            icon={status.icon}
            size={16}
            className={cn("size-3.5", phase === "running" && "animate-pulse")}
          />
          {status.text}
        </span>
      </div>

      {hasBody ? (
        <div className="border-t border-foreground/6 px-3.5 py-2.5">
          {rows.length > 0 ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {rows.map((row) => (
                <React.Fragment key={row.key}>
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd
                    className={cn(
                      "min-w-0 whitespace-pre-wrap wrap-anywhere",
                      row.key === "subject" && "font-medium",
                    )}
                  >
                    {row.before !== undefined ? (
                      <>
                        <span className="text-muted-foreground line-through">{row.before}</span>{" "}
                        {row.value}
                      </>
                    ) : (
                      row.value
                    )}
                    {row.detail ? (
                      <span className="text-muted-foreground"> · {row.detail}</span>
                    ) : null}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          ) : null}

          {prose.map((row, index) => (
            <ProseBlock
              key={row.key}
              label={hasSubject && row.key.startsWith("body") ? null : row.label}
              text={row.value}
              className={rows.length > 0 || index > 0 ? "mt-2.5" : undefined}
            />
          ))}

          {images.length > 0 ? (
            <div className={cn("flex flex-col gap-1", (rows.length > 0 || prose.length > 0) && "mt-2")}>
              <ul className="flex gap-1.5 overflow-x-auto">
                {images.slice(0, 6).map((url) => (
                  <li key={url} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-14 w-20 rounded-lg border border-foreground/10 object-cover"
                    />
                  </li>
                ))}
              </ul>
              <span className="text-xs text-muted-foreground">
                {t("photos", { count: images.length })}
              </span>
            </div>
          ) : null}

          {phase === "failed" && output && output.ok === false && output.fieldErrors ? (
            <ul className="mt-1 text-xs text-destructive">
              {Object.entries(output.fieldErrors).flatMap(([key, messages]) =>
                messages.map((message) => (
                  <li key={`${key}-${message}`}>
                    {t.has(`errors.${message}`) ? t(`errors.${message}`) : message}
                  </li>
                )),
              )}
            </ul>
          ) : null}
          {phase === "done" &&
          output?.ok &&
          typeof output.data?.skipped === "number" &&
          output.data.skipped > 0 ? (
            <p className={cn("text-xs text-muted-foreground", rows.length > 0 && "mt-2")}>
              {t("photos_skipped", { count: output.data.skipped })}
            </p>
          ) : null}
        </div>
      ) : null}

      {hasFooter ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-foreground/6 px-3.5 py-2">
          {phase === "pending" && approvalId ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={answered}
                onClick={() => {
                  setAnswered(true);
                  onRespond(approvalId, false);
                }}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={answered}
                onClick={() => {
                  setAnswered(true);
                  onRespond(approvalId, true);
                }}
              >
                {t("confirm")}
              </Button>
            </>
          ) : null}
          {phase === "done" && output?.ok && output.url ? (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="mr-auto -ml-1.5"
              onClick={() => void copy(output.url!)}
            >
              <Icon icon={Copy01Icon} size={16} className="size-3.5" />
              {t("copy_link")}
            </Button>
          ) : null}
          {phase === "done" && output?.ok && output.href ? (
            <Button size="xs" variant="outline" asChild>
              <Link
                href={output.href}
                aria-label={
                  output.hrefLabel
                    ? t("open_named", { name: output.hrefLabel })
                    : t("open")
                }
              >
                {t("open")}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProseBlock({
  label,
  text,
  className,
}: {
  label: string | null;
  text: string;
  className?: string;
}) {
  const t = useTranslations("home.ask.actions");
  const [open, setOpen] = React.useState(false);
  const long = text.split("\n").length > PROSE_CLAMP_LINES || text.length > 480;

  return (
    <div className={className}>
      {label ? <p className="mb-1 text-xs text-muted-foreground">{label}</p> : null}
      <div className="rounded-lg bg-muted/60 px-3 py-2.5">
        <p
          className={cn(
            "whitespace-pre-wrap wrap-anywhere text-sm leading-6",
            long && !open && "line-clamp-8",
          )}
        >
          {text}
        </p>
        {long ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="mt-1 cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {open ? t("show_less") : t("show_more")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
