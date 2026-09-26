import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Container } from "./primitives";

export async function SiteFooter() {
  const t = await getTranslations("marketing.footer");
  const link =
    "text-[15px] text-muted-foreground transition-colors hover:text-foreground";
  const columns = [
    {
      title: t("product"),
      links: [
        { href: "#product", label: t("viewings") },
        { href: "#product", label: t("inbox") },
        { href: "#product", label: t("ask") },
        { href: "#product", label: t("tasks") },
        { href: "#product", label: t("contracts") },
      ],
    },
    {
      title: t("company"),
      links: [
        { href: "#privacy", label: t("privacy") },
        { href: "#plans", label: t("plans") },
        { href: "/login", label: t("sign_in") },
      ],
    },
  ];

  return (
    <footer className="mt-8">
      <Image
        src="/marketing/torn-layers.webp"
        alt=""
        width={1800}
        height={1013}
        sizes="100vw"
        className="h-40 w-full object-cover object-[center_65%] [mask-image:linear-gradient(to_bottom,transparent,black_35%,black_65%,transparent)] sm:h-56"
      />
      <div className="bg-background">
        <Container className="grid grid-cols-1 gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link
              href="/"
              className="font-serif text-2xl font-medium tracking-tight"
            >
              Temas
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {t("tagline")}
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-[15px] font-medium">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((item) => (
                  <li key={item.label}>
                    {item.href.startsWith("#") ? (
                      <a href={item.href} className={link}>
                        {item.label}
                      </a>
                    ) : (
                      <Link href={item.href} className={link}>
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Container>
        <Container className="pb-10 text-xs text-muted-foreground">
          {t("rights", { year: new Date().getFullYear() })}
        </Container>
      </div>
    </footer>
  );
}
