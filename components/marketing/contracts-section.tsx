import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Container, CropPanel, Display, Eyebrow } from "./primitives";
import { Reveal } from "./reveal";

export async function ContractsSection() {
  const t = await getTranslations("marketing.contracts");

  return (
    <section id="contracts" className="scroll-mt-8 py-16">
      <Container>
        <Reveal>
          <CropPanel className="grid grid-cols-1 items-center gap-10 px-8 py-12 sm:px-14 md:grid-cols-[0.9fr_1.1fr]">
            <article
              aria-hidden
              className="mx-auto w-full max-w-sm space-y-4 rounded-xl border border-foreground/6 bg-card px-5 py-5"
            >
              <div className="inline-flex h-8 items-center rounded-full bg-muted p-0.5">
                <span className="flex h-7 items-center rounded-full bg-card px-3 text-xs">
                  {t("doc_document")}
                </span>
                <span className="flex h-7 items-center rounded-full px-3 text-xs text-muted-foreground">
                  {t("doc_edit")}
                </span>
              </div>
              <div className="space-y-3">
                <p className="font-serif text-xl font-medium tracking-tight">
                  {t("doc_title")}
                </p>
                <p className="text-sm leading-6">{t("doc_parties")}</p>
                <p className="text-sm leading-6">
                  {t("doc_rent_lead")}{" "}
                  <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 align-baseline text-xs text-muted-foreground">
                    {t("doc_chip")}
                  </span>
                  , {t("doc_rent")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-foreground/6 pt-4">
                <span className={cn(buttonVariants({ size: "sm" }), "pointer-events-none")}>
                  {t("doc_export_docx")}
                </span>
                <span
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "pointer-events-none",
                  )}
                >
                  {t("doc_export_pdf")}
                </span>
              </div>
            </article>
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
