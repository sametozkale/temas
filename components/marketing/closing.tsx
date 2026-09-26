import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

import { Container, Display, Polaroid, SIGNUP_HREF } from "./primitives";
import { Reveal } from "./reveal";

export async function Closing() {
  const [t, tp] = await Promise.all([
    getTranslations("marketing.closing"),
    getTranslations("marketing.polaroid"),
  ]);

  return (
    <section className="py-24 sm:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-[28px] bg-brand p-3 sm:p-6">
          <div className="grid grid-cols-1 items-center gap-12 rounded-[20px] bg-background px-6 py-14 sm:px-12 lg:grid-cols-[1fr_1.1fr]">
            <Reveal className="relative mx-auto w-full max-w-md">
              <span aria-hidden className="absolute -top-4 -left-4 size-4 border-t border-l border-foreground/70" />
              <span aria-hidden className="absolute -right-4 -bottom-4 size-4 border-r border-b border-foreground/70" />
              <Image
                src="/marketing/agent-portrait.webp"
                alt=""
                width={900}
                height={675}
                sizes="(min-width: 1024px) 440px, 90vw"
                className="aspect-[4/3] w-full object-cover"
              />
              <Polaroid
                photo="office"
                caption={tp("office")}
                className="absolute -right-6 -bottom-12 hidden w-32 rotate-[5deg] sm:block"
              />
            </Reveal>
            <Reveal delay={120}>
              <Display>{t("title")}</Display>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                {t("body")}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-2">
                <Button size="lg" asChild>
                  <Link href={SIGNUP_HREF}>{t("cta")}</Link>
                </Button>
                <Button size="lg" variant="ghost" asChild>
                  <Link href="/login">{t("secondary")}</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
