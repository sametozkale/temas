import { getTranslations } from "next-intl/server";

import {
  AiMagicIcon,
  Globe02Icon,
  Icon,
  Link01Icon,
  SquareLock01Icon,
  type IconSvgElement,
} from "@/components/icons";

import { Container, Display, Eyebrow } from "./primitives";
import { Reveal } from "./reveal";

const ITEMS: { key: "private" | "readonly" | "scoped" | "eu"; icon: IconSvgElement }[] = [
  { key: "private", icon: SquareLock01Icon },
  { key: "readonly", icon: AiMagicIcon },
  { key: "scoped", icon: Link01Icon },
  { key: "eu", icon: Globe02Icon },
];

export async function TrustGrid() {
  const t = await getTranslations("marketing.privacy");

  return (
    <section id="privacy" className="scroll-mt-8 py-24 sm:py-32">
      <Container>
        <Reveal className="max-w-2xl">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <Display>{t("title")}</Display>
          <p className="mt-6 text-lg text-muted-foreground">{t("body")}</p>
        </Reveal>
        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, index) => (
            <Reveal key={item.key} delay={index * 80} className="bg-card p-7">
              <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-foreground">
                <Icon icon={item.icon} size={20} />
              </span>
              <h3 className="mt-6 text-[15px] font-medium">
                {t(`${item.key}_title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`${item.key}_body`)}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
