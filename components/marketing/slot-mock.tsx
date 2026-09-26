import { getTranslations } from "next-intl/server";

import { CheckmarkCircle02Icon, Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

import { Container, Display, Eyebrow } from "./primitives";
import { Reveal } from "./reveal";

const DAY_START = 9;
const DAY_END = 21;
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

function Block({ range, tone }: { range: Range; tone: string }) {
  const span = DAY_END - DAY_START;
  return (
    <span
      className={cn("absolute inset-x-0 rounded-[3px]", tone)}
      style={{
        top: `${((range[0] - DAY_START) / span) * 100}%`,
        height: `${((range[1] - range[0]) / span) * 100}%`,
      }}
    />
  );
}

function Lane({ children }: { children?: React.ReactNode }) {
  return <div className="relative flex-1 rounded-[4px] bg-muted/70">{children}</div>;
}

export async function CalendarSection() {
  const t = await getTranslations("marketing.calendar");
  const legend = [
    { key: "you", tone: "bg-chart-1/60" },
    { key: "tenant", tone: "bg-chart-2/60" },
    { key: "bookable", tone: "bg-brand" },
  ] as const;

  return (
    <section className="py-24 sm:py-32">
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
          <div
            role="img"
            aria-label={t("title")}
            className="rounded-2xl bg-secondary p-3 sm:p-6"
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
                <div className="relative h-56">
                  {HOURS.map((hour) => (
                    <span
                      key={hour}
                      className="absolute left-0 -translate-y-1/2 text-[11px] text-muted-foreground/70 tabular-nums"
                      style={{
                        top: `${((hour - DAY_START) / (DAY_END - DAY_START)) * 100}%`,
                      }}
                    >
                      {String(hour).padStart(2, "0")}
                    </span>
                  ))}
                </div>
                {DAYS.map((day) => {
                  const tenant = TENANT[day];
                  return (
                    <div key={day} className="flex h-56 gap-1">
                      <Lane>
                        <Block range={AGENT} tone="bg-chart-1/60" />
                      </Lane>
                      <Lane>
                        {tenant ? <Block range={tenant} tone="bg-chart-2/60" /> : null}
                      </Lane>
                      <Lane>
                        {(SLOTS[day] ?? []).map((slot) => (
                          <Block key={slot[0]} range={slot} tone="bg-brand" />
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
                    <span className={cn("size-2.5 rounded-[3px]", item.tone)} />
                    {t(item.key)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
