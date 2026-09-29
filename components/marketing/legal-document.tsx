import { getTranslations } from "next-intl/server";

import { SUPPORT_EMAIL } from "@/lib/support";

import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";
import { Container } from "./primitives";

type Section = { title: string; paragraphs: string[] };

export async function LegalDocument({
  page,
}: {
  page: "privacy" | "terms";
}) {
  const t = await getTranslations(`marketing.legal.${page}`);
  const legal = await getTranslations("marketing.legal");
  const sections = t.raw("sections") as Section[];

  return (
    <>
      <SiteNav />
      <main>
        <Container className="max-w-3xl py-16 sm:py-24">
          <h1 className="font-serif text-4xl leading-[1.05] font-normal tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">{legal("updated")}</p>
          <p className="mt-8 text-base leading-relaxed text-muted-foreground">
            {t("intro")}
          </p>
          <div className="mt-12 space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-medium">{section.title}</h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-base leading-relaxed text-muted-foreground"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <p className="mt-12 text-base leading-relaxed text-muted-foreground">
            {legal.rich("contact", {
              email: SUPPORT_EMAIL,
              mail: (chunks) => (
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-foreground underline decoration-foreground/30 underline-offset-4"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
