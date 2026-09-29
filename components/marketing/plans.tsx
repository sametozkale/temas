import { getTranslations } from "next-intl/server";

import { Container, Display, Eyebrow } from "./primitives";
import { PlansGrid } from "./plans-grid";
import { Reveal } from "./reveal";

export async function Plans({ heading = "h2" }: { heading?: "h1" | "h2" }) {
  const t = await getTranslations("marketing.plans");

  return (
    <section id="plans" className="scroll-mt-8 py-24 sm:py-32">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Display as={heading}>{t("title")}</Display>
        </Reveal>
        <PlansGrid />
        <p className="mt-6 text-center text-xs text-muted-foreground">{t("note")}</p>
      </Container>
    </section>
  );
}
