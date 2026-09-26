import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { PLANS, formatUsd } from "@/lib/plans";

import { Container, Polaroid, SIGNUP_HREF } from "./primitives";
import { ProductMock } from "./product-mock";
import { Reveal } from "./reveal";

export async function Hero() {
  const [t, tp] = await Promise.all([
    getTranslations("marketing.hero"),
    getTranslations("marketing.polaroid"),
  ]);

  return (
    <section className="pt-16 pb-24 sm:pt-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-6 text-sm text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="font-serif text-5xl leading-[1.02] font-normal tracking-tight text-balance sm:text-6xl lg:text-7xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
            {t("description")}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-2">
            <Button size="lg" asChild>
              <Link href={SIGNUP_HREF}>{t("cta")}</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <a href="#product">{t("secondary")}</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("note", {
              amount: formatUsd(PLANS.free.price.annualMonthlyCents),
            })}
          </p>
        </div>

        <Reveal className="relative mx-auto mt-20 max-w-5xl">
          <Polaroid
            photo="keys"
            caption={tp("keys")}
            className="absolute -top-36 -left-6 z-10 hidden w-36 -rotate-6 lg:block xl:-left-16 xl:w-40"
          />
          <Polaroid
            photo="viewing"
            caption={tp("viewing")}
            className="absolute top-1/3 -right-6 z-10 hidden w-40 rotate-[5deg] lg:block xl:-right-20 xl:w-44"
          />
          <Polaroid
            photo="street"
            caption={tp("street")}
            className="absolute -bottom-14 -left-4 z-10 hidden w-32 rotate-[4deg] lg:block xl:-left-10 xl:w-36"
          />
          <Image
            src="/marketing/scrap-to-let.webp"
            alt=""
            width={586}
            height={850}
            sizes="160px"
            className="absolute -top-20 right-16 z-10 hidden w-32 rotate-[7deg] md:block"
          />
          <div className="rounded-[28px] bg-brand p-3 sm:p-8 lg:p-12">
            <ProductMock />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
