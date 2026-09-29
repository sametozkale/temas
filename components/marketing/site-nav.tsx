import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

import { ProductMenu } from "./product-menu";
import { Container, SIGNUP_HREF } from "./primitives";

export async function SiteNav() {
  const t = await getTranslations("marketing.nav");
  const anchor =
    "flex h-8 items-center rounded-full px-3 text-sm text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 dark:hover:bg-muted/50";

  return (
    <header>
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="font-serif text-2xl font-medium tracking-tight">
          Temas
        </Link>
        <nav aria-label={t("label")} className="hidden items-center gap-2 md:flex">
          <ProductMenu
            label={t("product")}
            items={[
              {
                id: "viewings",
                href: "/product/viewings",
                title: t("viewings"),
                line: t("viewings_line"),
              },
              {
                id: "inbox",
                href: "/product/inbox",
                title: t("inbox"),
                line: t("inbox_line"),
              },
              {
                id: "tasks",
                href: "/product/tasks",
                title: t("tasks"),
                line: t("tasks_line"),
              },
              {
                id: "ask",
                href: "/product/ask",
                title: t("ask"),
                line: t("ask_line"),
              },
              {
                id: "contracts",
                href: "/product/contracts",
                title: t("contracts"),
                line: t("contracts_line"),
              },
            ]}
          />
          <Link href="/pricing" className={anchor}>
            {t("pricing")}
          </Link>
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
