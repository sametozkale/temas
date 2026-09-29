import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Closing } from "@/components/marketing/closing";
import { marketingMetadata } from "@/components/marketing/metadata";
import { Plans } from "@/components/marketing/plans";
import { Container, Display, Eyebrow } from "@/components/marketing/primitives";
import { Reveal } from "@/components/marketing/reveal";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";

const QUESTIONS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.pricing");
  return marketingMetadata({
    title: t("meta_title"),
    description: t("meta_description"),
    path: "/pricing",
  });
}

export default async function PricingPage() {
  const t = await getTranslations("marketing.pricing");

  return (
    <>
      <SiteNav />
      <main>
        <Plans heading="h1" />
        <section className="pb-8">
          <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <Reveal>
              <Eyebrow>{t("faq_eyebrow")}</Eyebrow>
              <Display>{t("faq_title")}</Display>
            </Reveal>
            <dl className="divide-y divide-foreground/8 border-y border-foreground/8">
              {QUESTIONS.map((key) => (
                <div key={key} className="py-6">
                  <dt className="font-serif text-xl tracking-tight">{t(`${key}.question`)}</dt>
                  <dd className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                    {t(`${key}.answer`)}
                  </dd>
                </div>
              ))}
            </dl>
          </Container>
        </section>
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}
