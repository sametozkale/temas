import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="flex min-h-svh w-full flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex max-w-sm flex-col items-center gap-6">
        <div className="space-y-2">
          <h1 className="font-serif text-xl font-medium tracking-tight">
            {t("not_found_title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("not_found_description")}
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/home">{t("go_home")}</Link>
        </Button>
      </div>
    </div>
  );
}
