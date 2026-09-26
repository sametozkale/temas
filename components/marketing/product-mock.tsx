"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import {
  ArrowDown01Icon,
  ArrowUp02Icon,
  Building03Icon,
  Calendar03Icon,
  CheckmarkSquare02Icon,
  Home04Icon,
  Icon,
  InboxIcon,
  PlusSignIcon,
  Settings02Icon,
  type IconSvgElement,
} from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = ["home", "inbox", "calendar", "tasks", "properties"] as const;
type Tab = (typeof TABS)[number];

const ICONS: Record<Tab, IconSvgElement> = {
  home: Home04Icon,
  inbox: InboxIcon,
  calendar: Calendar03Icon,
  tasks: CheckmarkSquare02Icon,
  properties: Building03Icon,
};

/** Interactive replica of the app: the sidebar switches the canvas. */
export function ProductMock() {
  const t = useTranslations("marketing.mock");
  const [tab, setTab] = React.useState<Tab>("home");
  const chip = cn(
    buttonVariants({ variant: "pill", size: "xs" }),
    "pointer-events-none",
  );
  const eventChip = cn(
    buttonVariants({ variant: "pill", size: "xs" }),
    "pointer-events-none max-w-full",
  );

  return (
    <div
      className="flex overflow-hidden rounded-2xl bg-frame p-2 text-left sm:pl-0"
    >
      <nav
        aria-label={t("nav_label")}
        className="flex w-[42px] shrink-0 flex-col gap-4 px-1 py-3 sm:w-[212px] sm:px-2"
      >
        <div className="flex h-7 items-center gap-2 rounded-md pl-1 sm:pr-1">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
            {t("workspace")
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)}
          </span>
          <span className="hidden min-w-0 flex-1 items-center sm:flex">
            <span className="truncate text-sm font-medium">{t("workspace")}</span>
            <Icon
              icon={ArrowDown01Icon}
              size={16}
              className="ml-auto shrink-0 text-muted-foreground/50"
            />
          </span>
        </div>

        <div role="tablist" aria-label={t("nav_label")} className="flex flex-col gap-0.5">
          {TABS.map((id) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`mock-tab-${id}`}
                aria-selected={selected}
                aria-controls="mock-panel"
                onClick={() => setTab(id)}
                className={cn(
                  "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors",
                  selected
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Icon icon={ICONS[id]} size={18} className="shrink-0" />
                <span className="hidden truncate sm:inline">{t(`nav_${id}`)}</span>
                {id === "inbox" ? (
                  <span className="ml-auto hidden rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground sm:inline">
                    {t("inbox_count")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="hidden min-h-0 flex-1 flex-col gap-0.5 sm:flex">
          <div className="flex h-7 items-center px-2">
            <span className="text-[13px] text-secondary-foreground">{t("chats")}</span>
            <Icon
              icon={ArrowDown01Icon}
              size={16}
              className="ml-1 text-secondary-foreground"
            />
            <Icon
              icon={PlusSignIcon}
              size={16}
              className="ml-auto text-secondary-foreground"
            />
          </div>
          <p className="truncate px-2 text-[13px] leading-7 text-muted-foreground">
            {t("chat_1")}
          </p>
          <p className="truncate px-2 text-[13px] leading-7 text-muted-foreground">
            {t("chat_2")}
          </p>
        </div>

        <div className="mt-auto hidden flex-col gap-1.5 sm:flex">
          <div className="px-1.5">
            <span className="inline-flex size-7 items-center justify-center text-muted-foreground/50">
              <Icon icon={Settings02Icon} size={16} />
            </span>
          </div>
          <div className="px-1.5">
            <div className="h-px bg-sidebar-border/40" />
          </div>
          <div className="flex items-center gap-2 px-1.5 py-1">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
              {t("user_name")
                .split(" ")
                .map((word) => word[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">
                {t("user_name")}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {t("user_email")}
              </span>
            </span>
          </div>
        </div>
      </nav>

      <div
        id="mock-panel"
        role="tabpanel"
        aria-labelledby={`mock-tab-${tab}`}
        className="flex min-h-[460px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-foreground/6 bg-card sm:min-h-[520px]"
      >
        {tab === "home" ? <HomeCanvas chip={chip} eventChip={eventChip} /> : null}
        {tab === "inbox" ? <InboxCanvas /> : null}
        {tab === "calendar" ? <CalendarCanvas /> : null}
        {tab === "tasks" ? <TasksCanvas /> : null}
        {tab === "properties" ? <PropertiesCanvas /> : null}
      </div>
    </div>
  );
}

function HomeCanvas({
  chip,
  eventChip,
}: {
  chip: string;
  eventChip: string;
}) {
  const t = useTranslations("marketing.mock");
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <p className="text-center font-serif text-xl font-medium tracking-tight">
          {t("greeting")}
        </p>
        <div className="mt-6 flex h-11 items-center justify-between rounded-[22px] border border-border bg-card pr-1.5 pl-2 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <span className="flex size-8 items-center justify-center text-muted-foreground">
            <Icon icon={PlusSignIcon} size={18} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 truncate px-1 text-[15px] text-muted-foreground/50">
            {t("placeholder")}
          </span>
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon icon={ArrowUp02Icon} size={16} strokeWidth={2} className="rotate-90" />
          </span>
        </div>
        <div className="mt-10 space-y-4">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{t("suggestions")}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={chip}>{t("suggestion_1")}</span>
              <span className={chip}>{t("suggestion_2")}</span>
              <span className={cn(chip, "hidden sm:inline-flex")}>
                {t("suggestion_3")}
              </span>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{t("today")}</p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["1", "bg-brand-soft text-brand-foreground"],
                  ["2", "bg-info-soft text-info"],
                  ["3", "bg-warning-soft text-warning"],
                ] as const
              ).map(([id, wash]) => (
                <span
                  key={id}
                  className={cn(
                    eventChip,
                    wash,
                    id === "3" && "hidden sm:inline-flex",
                  )}
                >
                  <span className="shrink-0 tabular-nums opacity-70">
                    {t(`event_${id}_time`)}
                  </span>
                  <span className="truncate font-medium">
                    {t(`event_${id}_title`)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InboxCanvas() {
  const t = useTranslations("marketing.mock");
  const rows = ["1", "2", "3"] as const;
  return (
    <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
      <p className="px-2 py-2 text-[13px] font-medium">{t("nav_inbox")}</p>
      <ul>
        {rows.map((id) => (
          <li
            key={id}
            className="flex items-baseline gap-3 border-t border-foreground/6 px-2 py-3"
          >
            <span className="w-28 shrink-0 truncate text-[13px] font-medium">
              {t(`inbox_${id}_name`)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
              {t(`inbox_${id}_subject`)}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {t(`inbox_${id}_time`)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CalendarCanvas() {
  const t = useTranslations("marketing.mock");
  const days = ["mon", "tue", "wed", "thu", "fri"] as const;
  return (
    <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
      <p className="px-2 py-2 text-[13px] font-medium">{t("nav_calendar")}</p>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {days.map((day) => (
          <div key={day} className="min-h-28 rounded-md border border-foreground/6 p-1.5">
            <p className="text-[11px] text-muted-foreground">{t(`cal_${day}`)}</p>
            {day === "tue" ? (
              <p className="mt-2 truncate rounded-[3px] bg-brand-soft px-1 py-0.5 text-[11px] text-brand-foreground">
                {t("cal_1")}
              </p>
            ) : null}
            {day === "thu" ? (
              <p className="mt-2 truncate rounded-[3px] bg-brand-soft px-1 py-0.5 text-[11px] text-brand-foreground">
                {t("cal_2")}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksCanvas() {
  const t = useTranslations("marketing.mock");
  return (
    <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
      <p className="px-2 py-2 text-[13px] font-medium">{t("nav_tasks")}</p>
      <div className="mt-2 rounded-md bg-secondary px-3 py-2 text-[13px]">
        {t("task_group")}
      </div>
      {(["task_1", "task_2"] as const).map((key) => (
        <div
          key={key}
          className="flex items-center gap-2.5 border-b border-foreground/6 px-3 py-2.5 text-[13px]"
        >
          <span className="size-4 shrink-0 rounded-[4px] border border-foreground/15" />
          {t(key)}
        </div>
      ))}
    </div>
  );
}

function PropertiesCanvas() {
  const t = useTranslations("marketing.mock");
  return (
    <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
      <p className="px-2 py-2 text-[13px] font-medium">{t("nav_properties")}</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {(["1", "2"] as const).map((id) => (
          <div key={id} className="overflow-hidden rounded-xl border border-foreground/6">
            <div className="aspect-[4/3] bg-secondary" />
            <div className="p-3">
              <p className="text-[13px] font-medium">{t(`prop_${id}_title`)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t(`prop_${id}_meta`)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
