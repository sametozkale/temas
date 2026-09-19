"use client";

import { NextIntlClientProvider, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import en from "@/messages/en.json";

export function AppError({
  reset,
  className,
}: {
  reset: () => void;
  className?: string;
}) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <AppErrorBody reset={reset} className={className} />
    </NextIntlClientProvider>
  );
}

function AppErrorBody({
  reset,
  className,
}: {
  reset: () => void;
  className?: string;
}) {
  const t = useTranslations("errors");

  return (
    <div
      className={cn(
        "flex min-h-full w-full flex-1 flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex max-w-sm flex-col items-center gap-6">
        <div className="space-y-2">
          <h1 className="font-serif text-xl font-medium tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button size="lg" onClick={reset}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
