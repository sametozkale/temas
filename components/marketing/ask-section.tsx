import { getTranslations } from "next-intl/server";

import {
  ArrowUp02Icon,
  Calendar03Icon,
  CheckmarkSquare02Icon,
  Icon,
  Money01Icon,
  PlusSignIcon,
  UserGroupIcon,
  type IconSvgElement,
} from "@/components/icons";
import { cn } from "@/lib/utils";

import { Container, Display, Eyebrow } from "./primitives";
import { Reveal } from "./reveal";

const ROWS: {
  key: "row_viewings" | "row_applicants" | "row_deposits" | "row_tasks";
  icon: IconSvgElement;
  tone: string;
  count: number;
}[] = [
  { key: "row_viewings", icon: Calendar03Icon, tone: "bg-info-soft text-info", count: 12 },
  { key: "row_applicants", icon: UserGroupIcon, tone: "bg-brand-soft text-brand", count: 9 },
  { key: "row_deposits", icon: Money01Icon, tone: "bg-warning-soft text-warning", count: 3 },
  { key: "row_tasks", icon: CheckmarkSquare02Icon, tone: "bg-success-soft text-success", count: 14 },
];

export async function AskSection() {
  const t = await getTranslations("marketing.ask");

  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="rounded-[28px] bg-secondary px-4 py-12 sm:px-14 sm:py-20">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
            <Reveal className="px-2 sm:px-0">
              <Eyebrow>{t("eyebrow")}</Eyebrow>
              <Display>{t("title")}</Display>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                {t("body")}
              </p>
            </Reveal>

            <Reveal delay={120} className="space-y-3">
              <div
                aria-hidden
                className="mb-6 flex h-12 items-center gap-3 rounded-full border bg-card px-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
              >
                <Icon
                  icon={PlusSignIcon}
                  size={18}
                  strokeWidth={2}
                  className="text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate text-[15px]">{t("question")}</span>
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon icon={ArrowUp02Icon} size={16} strokeWidth={2} />
                </span>
              </div>
              <ul className="space-y-3">
                {ROWS.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center gap-3 rounded-full bg-card py-2 pr-5 pl-2 sm:gap-4 sm:pr-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 ring-foreground/6"
                  >
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-full",
                        row.tone,
                      )}
                    >
                      <Icon icon={row.icon} size={20} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] sm:text-[17px]">{t(row.key)}</span>
                    <span className="text-[15px] text-muted-foreground tabular-nums sm:text-[17px]">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
