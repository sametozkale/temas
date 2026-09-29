import { getTranslations } from "next-intl/server";

import { GmailMark, WhatsAppMark } from "@/components/brands";
import { Building03Icon, Icon, SparklesIcon } from "@/components/icons";
import { TaskPriorityIcon } from "@/components/tasks/priority-icon";
import { cn } from "@/lib/utils";

import { Bar, Bubble, Card, Check, Initials, RecordChip, buildSteps } from "./frame";

const TABS = ["tab_all", "tab_assigned", "tab_suggested"] as const;

async function Tabs({ active }: { active: (typeof TABS)[number] }) {
  const t = await getTranslations("marketing.features.tasks.screen");
  return (
    <div className="flex gap-5 border-b border-foreground/6 px-4">
      {TABS.map((key) => (
        <span
          key={key}
          className={cn(
            "-mb-px flex h-10 items-center gap-1.5 border-b text-sm",
            key === active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground",
          )}
        >
          {t(key)}
          {key === "tab_suggested" && active === "tab_suggested" ? (
            <span className="rounded-full bg-brand-soft px-1.5 text-[10px] text-brand-foreground tabular-nums">1</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

async function Promised() {
  const t = await getTranslations("marketing.features.tasks.screen");
  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-foreground/6 px-4 py-3">
        <WhatsAppMark className="size-4" />
        <span className="text-sm font-medium">{t("olivia")}</span>
        <span className="ml-auto">
          <RecordChip icon={Building03Icon}>{t("riverside")}</RecordChip>
        </span>
      </div>
      <div className="space-y-2.5 p-4">
        <Bubble side="in">{t("olivia_ask")}</Bubble>
        <Bubble side="out">{t("you_promise")}</Bubble>
        <p className="pt-2 text-right text-[11px] text-muted-foreground">{t("sent_at")}</p>
      </div>
    </Card>
  );
}

async function Suggestion() {
  const t = await getTranslations("marketing.features.tasks.screen");
  return (
    <Card>
      <p className="px-4 pt-3 text-sm font-medium">{t("tasks_title")}</p>
      <Tabs active="tab_suggested" />
      <div className="p-4">
        <div className="rounded-xl bg-muted/60 p-3">
          <span className="mb-2.5 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand-foreground">
            <Icon icon={SparklesIcon} size={16} className="size-3" />
            {t("suggested_from")}
          </span>
          <div className="rounded-lg bg-card p-3">
            <div className="flex items-start gap-3">
              <span className="flex-1 text-sm leading-snug">{t("task")}</span>
              <TaskPriorityIcon priority="medium" label={t("task")} decorative />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <WhatsAppMark className="size-3" />
              {t("source")}
            </p>
            <div className="mt-3 flex gap-2">
              <span className="flex h-7 items-center rounded-full bg-primary px-3 text-xs text-primary-foreground">{t("accept")}</span>
              <span className="flex h-7 items-center rounded-full bg-secondary px-3 text-xs">{t("dismiss")}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">{t("only_you")}</p>
      </div>
    </Card>
  );
}

async function NoTask() {
  const t = await getTranslations("marketing.features.tasks.screen");
  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-foreground/6 px-4 py-3">
        <GmailMark className="size-4" />
        <span className="text-sm font-medium">{t("james")}</span>
        <span className="ml-auto">
          <RecordChip icon={Building03Icon}>{t("canal")}</RecordChip>
        </span>
      </div>
      <div className="space-y-2.5 p-4">
        <Bubble side="out">{t("you_ask_docs")}</Bubble>
        <Bubble side="in">{t("james_reply")}</Bubble>
      </div>
      <div className="mx-4 mb-4 flex items-center gap-2.5 rounded-lg border border-dashed border-foreground/15 px-3 py-2.5 text-xs text-muted-foreground">
        <Icon icon={SparklesIcon} size={16} className="size-3.5" />
        {t("no_task")}
      </div>
    </Card>
  );
}

async function Board({ done }: { done: boolean }) {
  const t = await getTranslations("marketing.features.tasks.screen");
  return (
    <Card>
      <p className="px-4 pt-3 text-sm font-medium">{t("tasks_title")}</p>
      <Tabs active="tab_all" />
      <div className="p-2">
        <p className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-xs text-muted-foreground">
          <Icon icon={Building03Icon} size={16} className="size-3.5" />
          {t("riverside")}
        </p>
        {done ? null : (
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-2 py-2.5">
            <Check on={false} />
            <span className="min-w-0 flex-1 text-sm leading-snug">{t("task")}</span>
            <TaskPriorityIcon priority="medium" label={t("task")} decorative />
            <Initials className="size-6 bg-brand-soft text-brand-foreground">{t("you_initials")}</Initials>
          </div>
        )}
        <div className="flex items-center gap-3 px-2 py-2.5">
          <Check on={false} />
          <Bar className="w-1/2" />
          <span className="ml-auto">
            <TaskPriorityIcon priority="low" label={t("task")} decorative />
          </span>
          <Initials className="size-6">AR</Initials>
        </div>
        <p className="flex items-center gap-1.5 px-2 pt-3 pb-1 text-xs text-muted-foreground">
          <Icon icon={Building03Icon} size={16} className="size-3.5" />
          {t("canal")}
        </p>
        <div className="flex items-center gap-3 px-2 py-2.5">
          <Check on={false} />
          <Bar className="w-2/5" />
          <span className="ml-auto">
            <TaskPriorityIcon priority="high" label={t("task")} decorative />
          </span>
          <Initials className="size-6">EL</Initials>
        </div>
        {done ? (
          <>
            <p className="px-2 pt-3 pb-1 text-xs text-muted-foreground">{t("completed")}</p>
            <div className="flex items-center gap-3 rounded-lg bg-success-soft/60 px-2 py-2.5">
              <Check on />
              <span className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground line-through">{t("task")}</span>
              <span className="shrink-0 text-[11px] text-success-foreground">{t("done_by_thread")}</span>
            </div>
          </>
        ) : (
          <p className="px-2 pt-3 text-[11px] text-muted-foreground">{t("visible_now")}</p>
        )}
      </div>
    </Card>
  );
}

async function AutoDone() {
  const t = await getTranslations("marketing.features.tasks.screen");
  return (
    <div className="space-y-3">
      <Card className="p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <WhatsAppMark className="size-3" />
          {t("olivia")}
        </p>
        <Bubble side="in">{t("olivia_done")}</Bubble>
      </Card>
      <Board done />
    </div>
  );
}

export function tasksSteps() {
  return buildSteps("tasks", [
    <Promised key="1" />,
    <Suggestion key="2" />,
    <NoTask key="3" />,
    <Board key="4" done={false} />,
    <AutoDone key="5" />,
  ]);
}
