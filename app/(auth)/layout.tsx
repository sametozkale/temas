import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthPanel } from "@/components/marketing/auth-panel";
import { caveat } from "@/components/marketing/fonts";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("marketing.footer");

  return (
    <div
      className={`theme-light ${caveat.variable} grid min-h-svh grid-cols-1 bg-background text-foreground lg:grid-cols-2`}
    >
      <div className="flex min-h-svh flex-col px-6 sm:px-10">
        <header className="flex h-16 items-center">
          <Link
            href="/"
            className="font-serif text-2xl font-medium tracking-tight"
          >
            Temas
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="py-6 text-xs text-muted-foreground">
          {t("rights", { year: new Date().getFullYear() })}
        </footer>
      </div>
      <AuthPanel />
    </div>
  );
}
