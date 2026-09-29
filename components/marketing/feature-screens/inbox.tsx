import { getTranslations } from "next-intl/server";

import { GmailMark, WhatsAppMark } from "@/components/brands";
import {
  Building03Icon,
  Calendar03Icon,
  Icon,
  Search01Icon,
  SentIcon,
  SparklesIcon,
  SquareLock01Icon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

import { Bar, Bubble, Card, RecordChip, Window, buildSteps } from "./frame";

/** A fixed pattern that reads as a pairing code without being a real one. */
const QR = [
  "1111111010101111111",
  "1000001011001000001",
  "1011101001101011101",
  "1011101110011011101",
  "1011101010101011101",
  "1000001001011000001",
  "1111111010101111111",
  "0000000110010000000",
  "1101011011101101101",
  "0110100101010011010",
  "1011011100111010111",
  "0000000101101001010",
  "1111111011010110101",
  "1000001010011011001",
  "1011101001110101110",
  "1011101101001011011",
  "1011101011110100101",
  "1000001100101101010",
  "1111111010011011101",
];

async function Connect() {
  const t = await getTranslations("marketing.features.inbox.screen");
  const steps = ["pair_1", "pair_2", "pair_3"] as const;
  return (
    <Window title={t("connect_title")}>
      <div className="flex items-center gap-3 border-b border-foreground/6 px-4 py-3">
        <GmailMark className="size-5" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm">{t("google")}</span>
          <span className="block text-[11px] text-muted-foreground">{t("google_detail")}</span>
        </span>
        <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] text-success-foreground">
          {t("connected")}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-4">
        <div>
          <p className="flex items-center gap-2 text-sm">
            <WhatsAppMark className="size-4" />
            {t("whatsapp")}
          </p>
          <ol className="mt-3 space-y-2">
            {steps.map((key, index) => (
              <li key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-foreground tabular-nums">
                  {index + 1}
                </span>
                {t(key)}
              </li>
            ))}
          </ol>
        </div>
        <div className="grid grid-cols-[repeat(19,minmax(0,1fr))] gap-px rounded-lg border border-foreground/8 bg-card p-2">
          {QR.flatMap((row, y) =>
            row.split("").map((cell, x) => (
              <span
                key={`${x}-${y}`}
                className={cn("size-[5px]", cell === "1" ? "bg-foreground" : "bg-transparent")}
              />
            )),
          )}
        </div>
      </div>
    </Window>
  );
}

async function MatchedList() {
  const t = await getTranslations("marketing.features.inbox.screen");
  const rows = [
    { key: "r1", mark: "wa", unread: true },
    { key: "r2", mark: "gm", unread: true },
    { key: "r3", mark: "gm", unread: false },
    { key: "r4", mark: "wa", unread: false },
  ] as const;
  return (
    <Window title={t("inbox_title")}>
      <div className="border-b border-foreground/6 p-3">
        <span className="flex h-8 items-center gap-2 rounded-lg bg-muted/60 px-2.5 text-xs text-muted-foreground">
          <Icon icon={Search01Icon} size={16} className="size-3.5" />
          {t("search")}
        </span>
      </div>
      <ul>
        {rows.map((row) => (
          <li key={row.key} className="flex items-start gap-2.5 border-b border-foreground/6 px-4 py-3 last:border-b-0">
            <span className="mt-0.5 shrink-0">
              {row.mark === "wa" ? <WhatsAppMark className="size-3.5" /> : <GmailMark className="size-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className={cn("truncate text-sm", row.unread && "font-medium")}>{t(`${row.key}_name`)}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{t(`${row.key}_time`)}</span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{t(`${row.key}_preview`)}</span>
              <span className="mt-1.5 inline-flex">
                <RecordChip icon={Building03Icon}>{t(`${row.key}_property`)}</RecordChip>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Window>
  );
}

async function ThreadHeader() {
  const t = await getTranslations("marketing.features.inbox.screen");
  return (
    <div className="flex items-center gap-2 border-b border-foreground/6 px-4 py-3">
      <WhatsAppMark className="size-4" />
      <span className="text-sm font-medium">{t("r1_name")}</span>
      <span className="ml-auto">
        <RecordChip icon={Building03Icon}>{t("r1_property")}</RecordChip>
      </span>
    </div>
  );
}

async function Thread() {
  const t = await getTranslations("marketing.features.inbox.screen");
  return (
    <Card>
      <ThreadHeader />
      <div className="space-y-2.5 p-4">
        <Bubble side="in">{t("thread_1")}</Bubble>
        <Bubble side="out">{t("thread_2")}</Bubble>
        <p className="text-center text-[11px] text-muted-foreground">{t("thread_day")}</p>
        <Bubble side="in">{t("thread_3")}</Bubble>
      </div>
      <div className="border-t border-foreground/6 p-3">
        <span className="flex h-9 items-center justify-between rounded-lg border border-foreground/10 px-3 text-xs text-muted-foreground">
          {t("reply_placeholder")}
          <span className="flex items-center gap-1 text-foreground">
            <Icon icon={SparklesIcon} size={16} className="size-3.5" />
            {t("draft_button")}
          </span>
        </span>
      </div>
    </Card>
  );
}

async function Composer({ withLink }: { withLink: boolean }) {
  const t = await getTranslations("marketing.features.inbox.screen");
  const tones = ["tone_formal", "tone_friendly", "tone_short"] as const;
  return (
    <Card>
      <ThreadHeader />
      <div className="p-4">
        <Bubble side="in">{t("thread_3")}</Bubble>
      </div>
      <div className="m-3 mt-0 rounded-xl border border-foreground/10 bg-card p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon icon={SparklesIcon} size={16} className="size-3.5" />
            {t("draft_label")}
          </span>
          {withLink ? (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand-foreground">
              {t("intent")}
            </span>
          ) : (
            <span className="inline-flex h-7 items-center rounded-full bg-muted p-0.5">
              {tones.map((key, index) => (
                <span
                  key={key}
                  className={cn(
                    "flex h-6 items-center rounded-full px-2.5 text-[11px]",
                    index === 1 ? "bg-card text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t(key)}
                </span>
              ))}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed">{t("draft")}</p>
        {withLink ? (
          <>
            <p className="mt-2 text-sm leading-relaxed">{t("draft_link_lead")}</p>
            <span className="mt-2 flex items-center gap-2.5 rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2">
              <Icon icon={Calendar03Icon} size={18} className="text-brand" />
              <span className="min-w-0">
                <span className="block truncate text-sm">{t("link_title")}</span>
                <span className="block text-[11px] text-muted-foreground">{t("link_detail")}</span>
              </span>
            </span>
          </>
        ) : null}
        <div className="mt-3 space-y-1.5">
          <Bar className="w-24" />
          <Bar className="w-16" />
        </div>
        <div className="mt-3 flex justify-end">
          <span className="flex h-7 items-center gap-1 rounded-full bg-primary px-3 text-xs text-primary-foreground">
            <Icon icon={SentIcon} size={16} className="size-3.5" />
            {t("send")}
          </span>
        </div>
      </div>
    </Card>
  );
}

async function Sent() {
  const t = await getTranslations("marketing.features.inbox.screen");
  return (
    <Card>
      <ThreadHeader />
      <div className="space-y-2.5 p-4">
        <Bubble side="in">{t("thread_3")}</Bubble>
        <div className="ml-auto max-w-[85%]">
          <Bubble side="out" className="max-w-none">
            {t("draft")} {t("draft_link_lead")}
            <span className="mt-2 flex items-center gap-2.5 rounded-lg bg-card/70 px-3 py-2">
              <Icon icon={Calendar03Icon} size={18} className="text-brand" />
              <span className="min-w-0">
                <span className="block truncate text-sm">{t("link_title")}</span>
                <span className="block text-[11px] text-muted-foreground">{t("link_detail")}</span>
              </span>
            </span>
          </Bubble>
          <p className="mt-1 text-right text-[11px] text-muted-foreground">{t("sent_meta")}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-foreground/6 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <Icon icon={SquareLock01Icon} size={16} />
        {t("private")}
      </div>
    </Card>
  );
}

export function inboxSteps() {
  return buildSteps("inbox", [
    <Connect key="1" />,
    <MatchedList key="2" />,
    <Thread key="3" />,
    <Composer key="4" withLink={false} />,
    <Composer key="5" withLink />,
    <Sent key="6" />,
  ]);
}
