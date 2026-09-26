import { getTranslations } from "next-intl/server";

import { Container, Display, Eyebrow } from "./primitives";
import { PlansGrid } from "./plans-grid";
import { Reveal } from "./reveal";

export async function Plans() {
  const t = await getTranslations("marketing.plans");

  return (
    <section id="plans" className="scroll-mt-8 py-24 sm:py-32">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Display>{t("title")}</Display>
        </Reveal>
        <PlansGrid />
        <p className="mt-6 text-center text-xs text-muted-foreground">{t("note")}</p>
      </Container>
    </section>
  );
}
