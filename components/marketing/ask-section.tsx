import { getTranslations } from "next-intl/server";

import { ArrowUp02Icon, Building03Icon, Icon, PlusSignIcon } from "@/components/icons";

import { Container, Display, Eyebrow } from "./primitives";
import { Reveal } from "./reveal";

const ANSWERS = ["answer_1", "answer_2", "answer_3"] as const;

export async function AskSection() {
  const t = await getTranslations("marketing.ask");

  return (
    <section id="ask" className="scroll-mt-8 py-24 sm:py-32">
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
                className="mb-6 flex h-12 items-center gap-3 rounded-full border bg-card py-0 pr-2 pl-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
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
              <p className="px-4 text-[15px]">{t("answer")}</p>
              <ul className="space-y-3">
                {ANSWERS.map((key) => (
                  <li
                    key={key}
                    className="flex items-center gap-3 rounded-full bg-card py-2 pr-5 pl-2 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 ring-foreground/6 sm:gap-4 sm:pr-6"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
                      <Icon icon={Building03Icon} size={20} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] sm:text-[17px]">
                      {t(key)}
                    </span>
                    <span className="shrink-0 text-[13px] text-muted-foreground sm:text-sm">
                      {t("answer_status")}
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
