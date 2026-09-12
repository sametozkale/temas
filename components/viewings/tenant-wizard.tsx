"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { saveInviteeWeek } from "@/app/(public)/p/actions";
import { Button } from "@/components/ui/button";
import { WeekGrid } from "@/components/viewings/week-grid";
import { emptyWeek, type WeekCell } from "@/lib/viewings/week";

export function TenantWizard({
  token,
  week,
}: {
  token: string;
  week: WeekCell[];
}) {
  const t = useTranslations("tenant");
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [cells, setCells] = React.useState(week.length ? week : emptyWeek());
  const [pending, startTransition] = React.useTransition();

  if (step === 1) {
    return (
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("step1_body")}
        </p>
        <Button onClick={() => setStep(2)}>{t("continue")}</Button>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-3">
        <h2 className="font-serif text-2xl tracking-tight">
          {t("done_title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("done_body")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl tracking-tight">
          {t("step2_title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("step2_body")}</p>
      </div>
      <WeekGrid value={cells} onChange={setCells} />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => setStep(1)}>
          {t("back")}
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await saveInviteeWeek(token, cells);
              if (!res.ok) {
                toast.error(t("errors.generic"));
                return;
              }
              toast.success(t("saved"));
              setStep(3);
            })
          }
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
