"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function AppError({ reset }: { reset: () => void }) {
  const t = useTranslations("errors");

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-2xl tracking-tight">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <Button size="sm" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}
