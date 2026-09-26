import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Container, CropPanel, Display } from "./primitives";
import { Reveal } from "./reveal";

const ART = {
  viewings: { src: "/marketing/engraving-watch.webp", width: 616, height: 763 },
  inbox: { src: "/marketing/engraving-envelope.webp", width: 827, height: 846 },
  pipeline: { src: "/marketing/engraving-key.webp", width: 437, height: 732 },
} as const;

export async function FeatureTrio() {
  const t = await getTranslations("marketing.trio");
  const items = (["viewings", "inbox", "pipeline"] as const).map((key) => ({
    key,
    title: t(`${key}_title`),
    body: t(`${key}_body`),
    art: ART[key],
  }));

  return (
    <section id="product" className="scroll-mt-8 py-16">
      <Container>
        <Reveal>
          <Display className="max-w-2xl">{t("title")}</Display>
        </Reveal>
        <div className="mt-16 grid grid-cols-1 gap-14 md:grid-cols-3 md:gap-12">
          {items.map((item, index) => (
            <Reveal key={item.key} delay={index * 90}>
              <CropPanel className="flex h-full flex-col px-7 pt-10 pb-8">
                <div className="flex h-40 items-center justify-center">
                  <Image
                    src={item.art.src}
                    alt=""
                    width={item.art.width}
                    height={item.art.height}
                    sizes="200px"
                    className="max-h-40 w-auto"
                  />
                </div>
                <h3 className="mt-10 font-serif text-2xl leading-tight font-normal tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </CropPanel>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
