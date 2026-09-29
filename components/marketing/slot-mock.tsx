import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { CheckmarkCircle02Icon, Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

import { Container, Display, Eyebrow } from "./primitives";
import { Reveal } from "./reveal";

const DAY_START = 9;
const DAY_END = 21;
const SPAN = DAY_END - DAY_START;
const HOURS = [9, 12, 15, 18, 21];
const DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;
type Day = (typeof DAYS)[number];
type Range = [number, number];

/** Agent weekday hours, tenant evenings on Tue/Thu, and the 30 min + 15 min buffer slots in the overlap. */
const AGENT: Range = [10, 19];
const TENANT: Partial<Record<Day, Range>> = { tue: [17, 20], thu: [17, 20] };
const SLOTS: Partial<Record<Day, Range[]>> = {
  tue: [
    [17, 17.5],
    [17.75, 18.25],
    [18.5, 19],
  ],
  thu: [
    [17, 17.5],
    [17.75, 18.25],
    [18.5, 19],
  ],
};

function Block({ range, className }: { range: Range; className?: string }) {
  return (
    <span
      className={cn("absolute inset-x-0 rounded-[5px]", className)}
      style={{
        top: `${((range[0] - DAY_START) / SPAN) * 100}%`,
        height: `${((range[1] - range[0]) / SPAN) * 100}%`,
      }}
    />
  );
}

function Lane({
  children,
  wide = false,
}: {
  children?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative h-full rounded-[7px] bg-muted/30",
        wide ? "min-w-0 flex-[1.8]" : "w-3.5 shrink-0 sm:w-4",
      )}
    >
      {children}
    </div>
  );
}

export async function ViewingOverlap({ bare = false }: { bare?: boolean }) {
  const t = await getTranslations("marketing.calendar");
  const legend = [
    { key: "you", tone: "bg-chart-1/55" },
    { key: "tenant", tone: "bg-chart-2/70" },
    { key: "bookable", tone: "bg-brand" },
  ] as const;

  return (
    <div
      role="img"
      aria-label={t("title")}
      className={bare ? undefined : "rounded-2xl bg-secondary p-3 sm:p-6"}
    >
            <div
              aria-hidden
              className="rounded-xl border border-foreground/6 bg-card p-5 sm:p-6"
            >
              <div className="grid grid-cols-[32px_repeat(5,minmax(0,1fr))] gap-x-3">
                <span />
                {DAYS.map((day) => (
                  <span
                    key={day}
                    className="pb-3 text-center text-xs text-muted-foreground"
                  >
                    {t(day)}
                  </span>
                ))}
                <div className="relative h-64">
                  {HOURS.map((hour) => (
                    <span
                      key={hour}
                      className={cn(
                        "absolute left-0 text-[11px] text-muted-foreground/70 tabular-nums",
                        hour === DAY_START
                          ? "translate-y-0"
                          : hour === DAY_END
                            ? "-translate-y-full"
                            : "-translate-y-1/2",
                      )}
                      style={{ top: `${((hour - DAY_START) / SPAN) * 100}%` }}
                    >
                      {String(hour).padStart(2, "0")}
                    </span>
                  ))}
                </div>
                {DAYS.map((day) => {
                  const tenant = TENANT[day];
                  return (
                    <div key={day} className="flex h-64 justify-center gap-1">
                      <Lane wide>
                        <Block range={AGENT} className="bg-chart-1/55" />
                      </Lane>
                      <Lane>
                        {tenant ? (
                          <Block range={tenant} className="bg-chart-2/80" />
                        ) : null}
                      </Lane>
                      <Lane>
                        {(SLOTS[day] ?? []).map((slot) => (
                          <Block key={slot[0]} range={slot} className="rounded-full bg-brand" />
                        ))}
                      </Lane>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4">
                {legend.map((item) => (
                  <span
                    key={item.key}
                    className="flex items-center gap-2 text-[13px] text-secondary-foreground"
                  >
                    <span className={cn("size-2.5 rounded-[4px]", item.tone)} />
                    {t(item.key)}
                  </span>
                ))}
              </div>
            </div>
    </div>
  );
}

export async function CalendarSection() {
  const t = await getTranslations("marketing.calendar");

  return (
    <section id="viewings" className="scroll-mt-8 py-24 sm:py-32">
      <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Display>{t("title")}</Display>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            {t("body")}
          </p>
          <ul className="mt-8 space-y-3">
            {(["point_1", "point_2", "point_3"] as const).map((key) => (
              <li key={key} className="flex items-center gap-2.5 text-[15px]">
                <Icon
                  icon={CheckmarkCircle02Icon}
                  size={18}
                  className="text-brand"
                />
                {t(key)}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={120}>
          <ViewingOverlap />
        </Reveal>
      </Container>
    </section>
  );
}
