import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { GmailMark, WhatsAppMark } from "@/components/brands";
import { Icon, Link01Icon, SparklesIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { Container, CropPanel, Display } from "./primitives";
import { Reveal } from "./reveal";

export async function FeatureTrio() {
  const t = await getTranslations("marketing.trio");
  const items = [
    { key: "inbox", title: t("inbox_title"), body: t("inbox_body"), slice: <InboxSlice /> },
    { key: "pipeline", title: t("pipeline_title"), body: t("pipeline_body"), slice: <PipelineSlice /> },
    { key: "viewings", title: t("viewings_title"), body: t("viewings_body"), slice: <ViewingsSlice /> },
  ] as const;

  return (
    <section id="inbox" className="scroll-mt-8 py-16">
      <Container>
        <Reveal>
          <Display className="max-w-2xl">{t("title")}</Display>
        </Reveal>
        <div className="mt-16 grid grid-cols-1 gap-14 md:grid-cols-3 md:gap-12">
          {items.map((item, index) => (
            <Reveal key={item.key} delay={index * 90}>
              <CropPanel className="flex h-full flex-col px-5 pt-8 pb-8 sm:px-7">
                <div className="min-h-56">{item.slice}</div>
                <h3 className="mt-8 font-serif text-2xl leading-tight font-normal tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </CropPanel>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Slice({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "overflow-hidden rounded-xl border border-foreground/6 bg-card text-left",
        className,
      )}
    >
      {children}
    </div>
  );
}

async function ViewingsSlice() {
  const t = await getTranslations("marketing.trio");
  const slots = ["viewings_slot_1", "viewings_slot_2", "viewings_slot_3"] as const;

  return (
    <Slice>
      <div className="px-3 pt-3 pb-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[13px] font-medium">{t("viewings_property")}</p>
          <p className="shrink-0 text-xs text-muted-foreground">{t("viewings_length")}</p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("viewings_day")}</p>
        <div className="mt-1.5 flex flex-col gap-1">
          {slots.map((key) => (
            <span
              key={key}
              className={cn(
                "flex h-7 items-center rounded-md px-2.5 text-xs tabular-nums",
                key === "viewings_slot_2"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground",
              )}
            >
              {t(key)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 border-t border-foreground/6 px-3 py-2 text-xs text-muted-foreground">
        <Icon icon={Link01Icon} size={16} className="shrink-0" />
        <span className="truncate">{t("viewings_link")}</span>
      </div>
    </Slice>
  );
}

async function InboxSlice() {
  const t = await getTranslations("marketing.trio");
  const rows = [
    {
      key: "1",
      mark: <WhatsAppMark className="size-3.5" />,
      name: t("inbox_1_name"),
      preview: t("inbox_1_preview"),
      time: t("inbox_1_time"),
      property: t("inbox_1_property"),
    },
    {
      key: "2",
      mark: <GmailMark className="size-3.5" />,
      name: t("inbox_2_name"),
      preview: t("inbox_2_preview"),
      time: t("inbox_2_time"),
      property: t("inbox_2_property"),
    },
  ] as const;

  return (
    <Slice>
      <ul>
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-start gap-2 border-b border-foreground/6 px-3 py-2"
          >
            <span className="mt-0.5 shrink-0">{row.mark}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium">{row.name}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{row.time}</span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {row.preview}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {row.property}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="bg-muted/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Icon icon={SparklesIcon} size={16} className="size-3" />
          {t("inbox_draft_label")}
        </p>
        <p className="text-[13px] leading-snug">{t("inbox_draft")}</p>
      </div>
    </Slice>
  );
}

async function PipelineSlice() {
  const t = await getTranslations("marketing.trio");

  return (
    <Slice className="bg-muted/30 p-2">
      <div className="grid grid-cols-2 gap-2">
        <Stage
          name={t("pipeline_stage_1")}
          dot="bg-info"
          cards={[
            {
              house: t("pipeline_house_1"),
              meta: t("pipeline_house_1_meta"),
              score: t("pipeline_house_1_score"),
              people: t("pipeline_house_1_initials").split(" "),
            },
            {
              house: t("pipeline_house_3"),
              meta: t("pipeline_house_3_meta"),
              score: t("pipeline_house_3_score"),
              people: t("pipeline_house_3_initials").split(" "),
            },
          ]}
        />
        <Stage
          name={t("pipeline_stage_2")}
          dot="bg-brand"
          cards={[
            {
              house: t("pipeline_house_2"),
              meta: t("pipeline_house_2_meta"),
              score: t("pipeline_house_2_score"),
              people: t("pipeline_house_2_initials").split(" "),
            },
          ]}
        />
      </div>
    </Slice>
  );
}

function Stage({
  name,
  dot,
  cards,
}: {
  name: string;
  dot: string;
  cards: { house: string; meta: string; score: string; people: string[] }[];
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] text-muted-foreground">
        <span className={cn("size-1.5 shrink-0 rounded-full", dot)} />
        <span className="truncate">{name}</span>
      </p>
      <div className="flex flex-col gap-1.5">
        {cards.map((card) => (
          <div
            key={card.house}
            className="rounded-lg border border-border bg-card px-2 py-2 shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="flex -space-x-1.5">
                {card.people.map((initial) => (
                  <span
                    key={initial}
                    className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground ring-2 ring-card"
                  >
                    {initial}
                  </span>
                ))}
              </span>
              <Badge variant="info" className="h-4 px-1.5 text-[10px]">
                {card.score}
              </Badge>
            </div>
            <p className="mt-2 truncate text-[13px] font-medium">{card.house}</p>
            <p className="truncate text-[11px] text-muted-foreground">{card.meta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
