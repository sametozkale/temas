import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Container, CropPanel, Display, Eyebrow } from "./primitives";
import { Reveal } from "./reveal";

export async function ContractsSection() {
  const t = await getTranslations("marketing.contracts");

  return (
    <section className="py-16">
      <Container>
        <Reveal>
          <CropPanel className="grid grid-cols-1 items-center gap-10 px-8 py-12 sm:px-14 md:grid-cols-[0.9fr_1.1fr]">
            <Image
              src="/marketing/engraving-pen.webp"
              alt=""
              width={881}
              height={496}
              sizes="(min-width: 768px) 420px, 80vw"
              className="mx-auto w-full max-w-sm"
            />
            <div>
              <Eyebrow>{t("eyebrow")}</Eyebrow>
              <Display className="text-3xl sm:text-4xl">{t("title")}</Display>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                {t("body")}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">{t("note")}</p>
            </div>
          </CropPanel>
        </Reveal>
      </Container>
    </section>
  );
}
