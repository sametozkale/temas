"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { SettingsGroup } from "@/components/settings/settings-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatUsd } from "@/lib/plans";
import {
  SUPPORT_PLAN_IDS,
  SUPPORT_PRICES,
  supportMailto,
  type SupportPlanId,
} from "@/lib/support";
import { cn } from "@/lib/utils";

import {
  selectSupportPlan,
  sendPriorityNote,
  type SupportState,
} from "./actions";

export function SupportPanel({
  plan,
  whatsappPhone,
  whatsappHref,
}: {
  plan: SupportPlanId;
  whatsappPhone: string | null;
  whatsappHref: string | null;
}) {
  const t = useTranslations("settings.support");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [noteState, noteAction, notePending] = useActionState<
    SupportState | undefined,
    FormData
  >(sendPriorityNote, undefined);
  const [sentCount, setSentCount] = React.useState(0);

  React.useEffect(() => {
    if (!noteState) return;
    if (noteState.ok) {
      toast.success(t("sent"));
      setSentCount((count) => count + 1);
      return;
    }
    if (noteState.error !== "invalid") {
      toast.error(t(`errors.${noteState.error as "send_failed"}`));
    }
  }, [noteState, t]);

  function choose(next: SupportPlanId) {
    startTransition(async () => {
      const result = await selectSupportPlan(next);
      if (result.ok) {
        toast.success(t("switched"));
        router.refresh();
        return;
      }
      toast.error(tCommon("error_generic"));
    });
  }

  const fieldErrors =
    noteState && !noteState.ok ? noteState.fieldErrors : undefined;

  return (
    <>
      <SettingsGroup title={t("plans")} footer={t("plan_hint")}>
        <div className="grid gap-2">
          {SUPPORT_PLAN_IDS.map((id) => {
            const selected = id === plan;
            const price = SUPPORT_PRICES[id];
            return (
              <div
                key={id}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between",
                  selected && "border-brand/25",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{t(`plan_${id}`)}</p>
                    {selected ? (
                      <Badge variant="brand">{t("current")}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 font-serif text-2xl font-medium tracking-tight">
                    {price === 0
                      ? t("included_price")
                      : t("price_month", { amount: formatUsd(price) })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                  {id === "founder" && plan === "founder" && whatsappPhone
                    ? t("plan_founder_ready", { phone: whatsappPhone })
                    : t(`plan_${id}_description`)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {id === "included" ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={supportMailto()}>{t("email_action")}</a>
                    </Button>
                  ) : null}
                  {id === "founder" && plan === "founder" && whatsappHref ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={whatsappHref} target="_blank" rel="noreferrer">
                        {t("whatsapp_action")}
                      </a>
                    </Button>
                  ) : null}
                  {selected ? null : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => choose(id)}
                      >
                        {t("buy_monthly")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() => choose(id)}
                      >
                        {t("subscribe")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SettingsGroup>

      {plan === "priority" ? (
        <SettingsGroup
          title={t("priority_box")}
          footer={t("priority_box_description")}
        >
          <form action={noteAction} key={sentCount}>
            <div className="rounded-2xl border bg-card p-4">
              <div className="mb-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={supportMailto()}>{t("email_action")}</a>
                </Button>
                {whatsappHref ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={whatsappHref} target="_blank" rel="noreferrer">
                      {t("whatsapp_action")}
                    </a>
                  </Button>
                ) : null}
              </div>
              {whatsappPhone ? (
                <p className="mb-4 text-xs text-muted-foreground">
                  {t("priority_whatsapp", { phone: whatsappPhone })}
                </p>
              ) : null}
              <FieldGroup>
                <Field data-invalid={fieldErrors?.subject ? true : undefined}>
                  <FieldLabel htmlFor="priority-subject">
                    {t("subject")}
                  </FieldLabel>
                  <Input
                    id="priority-subject"
                    name="subject"
                    required
                    minLength={3}
                    maxLength={120}
                    placeholder={t("subject_placeholder")}
                    aria-invalid={fieldErrors?.subject ? true : undefined}
                  />
                </Field>
                <Field data-invalid={fieldErrors?.body ? true : undefined}>
                  <FieldLabel htmlFor="priority-body">{t("body")}</FieldLabel>
                  <Textarea
                    id="priority-body"
                    name="body"
                    required
                    minLength={8}
                    maxLength={4000}
                    rows={5}
                    placeholder={t("body_placeholder")}
                    aria-invalid={fieldErrors?.body ? true : undefined}
                    className="min-h-32 resize-y"
                  />
                  {fieldErrors?.subject || fieldErrors?.body ? (
                    <FieldError>{t("errors.invalid")}</FieldError>
                  ) : null}
                </Field>
              </FieldGroup>
              <div className="mt-4 flex justify-end">
                <Button type="submit" size="sm" disabled={notePending}>
                  {t("send")}
                </Button>
              </div>
            </div>
          </form>
        </SettingsGroup>
      ) : null}
    </>
  );
}
