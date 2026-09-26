import { getTranslations } from "next-intl/server";

import { Container, Eyebrow } from "./primitives";
import { Reveal } from "./reveal";

export async function Intro() {
  const t = await getTranslations("marketing.intro");

  return (
    <section className="py-24 sm:py-32">
      <Container>
        <Reveal className="mx-auto max-w-2xl">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <p className="font-serif text-3xl leading-snug tracking-tight text-balance sm:text-4xl">
            {t("lead")}
          </p>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted-foreground">
            <p>{t("body_1")}</p>
            <p>{t("body_2")}</p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
