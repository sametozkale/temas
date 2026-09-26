import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

import { Container, SIGNUP_HREF } from "./primitives";

export async function SiteNav() {
  const t = await getTranslations("marketing.nav");
  const anchor =
    "text-sm text-muted-foreground transition-colors hover:text-foreground";

  return (
    <header>
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="font-serif text-2xl font-medium tracking-tight"
        >
          Temas
        </Link>
        <nav aria-label={t("label")} className="hidden items-center gap-8 md:flex">
          <a href="#product" className={anchor}>
            {t("product")}
          </a>
          <a href="#privacy" className={anchor}>
            {t("privacy")}
          </a>
          <a href="#plans" className={anchor}>
            {t("plans")}
          </a>
        </nav>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" asChild>
            <Link href="/login">{t("sign_in")}</Link>
          </Button>
          <Button asChild>
            <Link href={SIGNUP_HREF}>{t("start")}</Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
