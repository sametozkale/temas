import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CheckmarkCircle02Icon, Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";

import { askSteps } from "./feature-screens/ask";
import { contractsSteps } from "./feature-screens/contracts";
import { inboxSteps } from "./feature-screens/inbox";
import { tasksSteps } from "./feature-screens/tasks";
import { viewingsSteps } from "./feature-screens/viewings";
import { FeatureWalkthrough } from "./feature-walkthrough";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";
import { Container, Display, Eyebrow, SIGNUP_HREF } from "./primitives";
import { Reveal } from "./reveal";

const STEPS = {
  viewings: viewingsSteps,
  inbox: inboxSteps,
  tasks: tasksSteps,
  ask: askSteps,
  contracts: contractsSteps,
} as const;

export type FeaturePageId = keyof typeof STEPS;

const OUTCOMES = ["outcome_1", "outcome_2", "outcome_3"] as const;

export async function FeaturePage({ page }: { page: FeaturePageId }) {
  const [t, shared, closing, steps] = await Promise.all([
    getTranslations(`marketing.features.${page}`),
    getTranslations("marketing.features"),
    getTranslations("marketing.closing"),
    STEPS[page](),
  ]);

  return (
    <>
      <SiteNav />
      <main>
        <section className="pt-16 pb-16 sm:pt-24">
          <Container className="max-w-3xl">
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h1 className="font-serif text-4xl leading-[1.05] font-normal tracking-tight text-balance sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
              {t("lead")}
            </p>
          </Container>
        </section>

        <section className="pb-20 sm:pb-28">
          <Container className="max-w-3xl">
            <Reveal className="border-l-2 border-foreground/10 pl-6">
              <p className="text-sm text-muted-foreground">{shared("problem")}</p>
              <p className="mt-3 font-serif text-2xl leading-snug tracking-tight text-pretty sm:text-3xl">
                {t("problem_body")}
              </p>
            </Reveal>
          </Container>
        </section>

        <section className="pb-24 sm:pb-32">
          <Container>
            <div className="mb-14 max-w-2xl">
              <Eyebrow>{shared("how")}</Eyebrow>
              <Display>{t("how_title")}</Display>
            </div>
            <FeatureWalkthrough steps={steps} />
          </Container>
        </section>

        <section className="pb-24">
          <Container>
            <Reveal className="rounded-2xl bg-secondary px-6 py-10 sm:px-12 sm:py-14">
              <Eyebrow>{shared("outcome")}</Eyebrow>
              <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {OUTCOMES.map((key) => (
                  <li key={key} className="flex gap-3">
                    <Icon icon={CheckmarkCircle02Icon} size={20} className="mt-1 shrink-0 text-brand" />
                    <span className="font-serif text-xl leading-snug tracking-tight">{t(key)}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="mt-10" asChild>
                <Link href={SIGNUP_HREF}>{closing("cta")}</Link>
              </Button>
            </Reveal>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
