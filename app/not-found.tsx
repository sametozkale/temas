import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-2xl tracking-tight">
        {t("not_found_title")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("not_found_description")}
      </p>
      <Button size="sm" asChild>
        <Link href="/home">{t("go_home")}</Link>
      </Button>
    </div>
  );
}
