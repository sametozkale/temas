import { getTranslations } from "next-intl/server";

import {
  ArrowDown01Icon,
  Building03Icon,
  Icon,
  SparklesIcon,
} from "@/components/icons";
import { TaskPriorityIcon } from "@/components/tasks/priority-icon";
import { Badge } from "@/components/ui/badge";

import { Container, Display, Eyebrow } from "./primitives";
import { Reveal } from "./reveal";

export async function TaskSection() {
  const t = await getTranslations("marketing.tasks");

  return (
    <section className="py-24 sm:py-32">
      <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
        <Reveal className="order-2 lg:order-1">
          <div
            role="img"
            aria-label={t("title")}
            className="rounded-2xl border border-foreground/6 bg-card p-5 sm:p-7"
          >
            <div aria-hidden className="space-y-3">
              <p className="text-xs text-muted-foreground">{t("from")}</p>
              <p className="max-w-[85%] rounded-2xl bg-secondary px-4 py-2.5 text-[15px]">
                {t("message")}
              </p>
              <p className="pt-1 text-right text-xs text-muted-foreground">
                {t("you")}
              </p>
              <p className="ml-auto max-w-[85%] rounded-2xl bg-brand-soft px-4 py-2.5 text-[15px] text-brand-foreground">
                {t("reply")}
              </p>
              <div className="flex justify-center py-2 text-muted-foreground/60">
                <Icon icon={ArrowDown01Icon} size={20} />
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <Badge variant="brand" className="mb-2.5 gap-1">
                  <Icon icon={SparklesIcon} size={16} className="size-3" />
                  {t("suggested")}
                </Badge>
                <div className="flex items-start gap-3 rounded-lg bg-card px-3 py-2.5">
                  <span className="mt-0.5">
                    <TaskPriorityIcon
                      priority="medium"
                      label={t("task")}
                      decorative
                    />
                  </span>
                  <span className="mt-0.5 size-4 shrink-0 rounded-[4px] border border-foreground/15" />
                  <span className="flex-1 text-sm leading-snug">{t("task")}</span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                  <Icon icon={Building03Icon} size={16} className="size-3.5" />
                  {t("property")}
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120} className="order-1 lg:order-2">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Display>{t("title")}</Display>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            {t("body")}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
