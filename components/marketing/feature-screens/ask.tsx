import Image from "next/image";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import {
  AiMagicIcon,
  ArrowUp02Icon,
  BubbleChatIcon,
  Building03Icon,
  Calendar03Icon,
  CheckListIcon,
  Icon,
  Mail01Icon,
  PencilEdit01Icon,
  PlusSignIcon,
  Tick02Icon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

import { Bar, Card, Check, RecordChip, buildSteps } from "./frame";

async function Composer({ question }: { question?: string }) {
  const t = await getTranslations("marketing.features.ask.screen");
  return (
    <div className="flex h-11 items-center gap-2.5 rounded-full border border-foreground/10 bg-card pr-1.5 pl-3.5">
      <Icon icon={PlusSignIcon} size={16} className="text-muted-foreground" />
      <span className={cn("min-w-0 flex-1 truncate text-sm", question ? "" : "text-muted-foreground")}>
        {question ?? t("placeholder")}
      </span>
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon icon={ArrowUp02Icon} size={16} />
      </span>
    </div>
  );
}

async function Home() {
  const t = await getTranslations("marketing.features.ask.screen");
  const chips = ["chip_1", "chip_2", "chip_3"] as const;
  return (
    <Card className="px-5 py-10 sm:px-10">
      <p className="text-center font-serif text-2xl tracking-tight">{t("greeting")}</p>
      <div className="mt-6">
        <Composer />
      </div>
      <p className="mt-5 text-xs text-muted-foreground">{t("suggestions")}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {chips.map((key) => (
          <span key={key} className="flex h-7 items-center rounded-full bg-secondary px-3 text-xs">{t(key)}</span>
        ))}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">{t("today")}</p>
      <span className="mt-2 inline-flex h-7 items-center gap-2 rounded-full bg-brand-soft px-3 text-xs text-brand-foreground">
        <span className="text-brand-foreground/70 tabular-nums">{t("today_time")}</span>
        {t("today_event")}
      </span>
    </Card>
  );
}

function Chat({ question, children }: { question: string; children: ReactNode }) {
  return (
    <Card className="flex min-h-[20rem] flex-col p-4">
      <div className="flex-1 space-y-3">
        <p className="ml-auto max-w-[85%] rounded-2xl bg-brand-soft px-3.5 py-2 text-sm text-brand-foreground">
          {question}
        </p>
        <div className="max-w-[92%] rounded-2xl bg-secondary px-3.5 py-2.5 text-sm leading-[1.9]">{children}</div>
      </div>
      <div className="mt-6">
        <Composer />
      </div>
    </Card>
  );
}

async function Deposits() {
  const t = await getTranslations("marketing.features.ask.screen");
  return (
    <Chat question={t("q_deposit")}>
      {t("a_deposit")}
      <RecordChip icon={Building03Icon}>{t("riverside")}</RecordChip>,
      <RecordChip icon={Building03Icon}>{t("canal")}</RecordChip>
      {t("and")}
      <RecordChip icon={Building03Icon}>{t("high_street")}</RecordChip>.
    </Chat>
  );
}

async function Viewings() {
  const t = await getTranslations("marketing.features.ask.screen");
  return (
    <Chat question={t("q_viewings")}>
      {t("a_viewings_1")}
      <RecordChip icon={Building03Icon}>{t("riverside")}</RecordChip>
      {t("a_viewings_2")}
      <RecordChip icon={Building03Icon}>{t("canal")}</RecordChip>.
      <span className="mt-2 flex items-center gap-2 border-t border-foreground/8 pt-2 text-xs text-muted-foreground">
        <Icon icon={Calendar03Icon} size={16} className="size-3.5" />
        {t("a_viewings_source")}
      </span>
    </Chat>
  );
}

async function FromInbox() {
  const t = await getTranslations("marketing.features.ask.screen");
  return (
    <Chat question={t("q_inbox")}>
      {t("a_inbox")}
      <span className="mt-2 flex flex-wrap items-center gap-1 border-t border-foreground/8 pt-2 text-xs text-muted-foreground">
        {t("source")}
        <RecordChip icon={Mail01Icon}>{t("james_thread")}</RecordChip>
      </span>
    </Chat>
  );
}

async function Record() {
  const t = await getTranslations("marketing.features.ask.screen");
  const tabs = ["tab_overview", "tab_people", "tab_viewings", "tab_files"] as const;
  return (
    <Card className="overflow-hidden">
      <div className="relative h-32">
        <Image src="/marketing/riverside-flat.webp" alt="" fill sizes="480px" className="object-cover" />
      </div>
      <div className="p-4">
        <p className="font-serif text-xl tracking-tight">{t("riverside")}</p>
        <Bar className="mt-2 w-40" />
        <div className="mt-4 flex gap-4 border-b border-foreground/6 text-xs">
          {tabs.map((key, index) => (
            <span
              key={key}
              className={cn(
                "-mb-px border-b pb-2",
                index === 0 ? "border-foreground" : "border-transparent text-muted-foreground",
              )}
            >
              {t(key)}
            </span>
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <dt className="text-[11px] text-muted-foreground">{t("rent_label")}</dt>
            <dd className="text-sm tabular-nums">{t("rent")}</dd>
          </div>
          <div className="rounded-lg bg-warning-soft px-3 py-2">
            <dt className="text-[11px] text-warning-foreground/80">{t("deposit_label")}</dt>
            <dd className="text-sm text-warning-foreground">{t("deposit_missing")}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

const ACTIONS = [
  { key: "act_book", icon: Calendar03Icon },
  { key: "act_send", icon: BubbleChatIcon },
  { key: "act_task", icon: CheckListIcon },
  { key: "act_field", icon: Building03Icon },
] as const;

async function Act({ done }: { done: boolean }) {
  const t = await getTranslations("marketing.features.ask.screen");
  const chats = ["chat_1", "chat_2", "chat_3"] as const;
  return (
    <Card className="grid grid-cols-[10rem_1fr] overflow-hidden">
      <div className="border-r border-foreground/6 bg-muted/40 p-3">
        <p className="text-[11px] text-muted-foreground">{t("chats")}</p>
        <ul className="mt-2 space-y-1">
          {chats.map((key, index) => (
            <li
              key={key}
              className={cn(
                "truncate rounded-md px-2 py-1.5 text-xs",
                index === 0 ? "bg-card text-foreground" : "text-muted-foreground",
              )}
            >
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0 space-y-3 p-4">
        <p className="ml-auto max-w-[92%] rounded-2xl bg-brand-soft px-3.5 py-2 text-sm leading-snug text-brand-foreground">
          {t("q_act")}
        </p>
        <div className="rounded-2xl bg-secondary p-2.5">
          <p className="flex items-center gap-1.5 px-1 pb-2 text-xs text-muted-foreground">
            <Icon icon={AiMagicIcon} size={16} className="size-3.5" />
            {done ? t("act_done_intro") : t("act_intro")}
          </p>
          <ul className="divide-y divide-foreground/6 rounded-xl bg-card">
            {ACTIONS.map(({ key, icon }) => (
              <li key={key} className="flex items-center gap-2.5 px-3 py-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon icon={icon} size={16} className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{t(key)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{t(`${key}_detail`)}</span>
                </span>
                {done ? (
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-brand">
                    <Icon icon={Tick02Icon} size={16} className="size-3.5" />
                    {t("act_status_done")}
                  </span>
                ) : (
                  <Check on />
                )}
              </li>
            ))}
          </ul>
          {done ? (
            <p className="px-1 pt-2.5 text-xs text-muted-foreground">{t("act_done_note")}</p>
          ) : (
            <div className="flex items-center gap-2 px-1 pt-2.5">
              <span className="flex h-8 items-center rounded-full bg-primary px-3.5 text-xs text-primary-foreground">
                {t("act_confirm")}
              </span>
              <span className="flex h-8 items-center gap-1.5 rounded-full border border-foreground/10 bg-card px-3 text-xs">
                <Icon icon={PencilEdit01Icon} size={16} className="size-3.5" />
                {t("act_edit")}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function askSteps() {
  return buildSteps("ask", [
    <Home key="1" />,
    <Deposits key="2" />,
    <Viewings key="3" />,
    <FromInbox key="4" />,
    <Record key="5" />,
    <Act key="6" done={false} />,
    <Act key="7" done />,
  ]);
}
