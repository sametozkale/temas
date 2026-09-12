"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AI_LANGUAGES, TONES } from "@/lib/ai/types";

import { updateAiPreferences, type SettingsState } from "../actions";

export function AiPreferencesForm({
  signature,
  language,
  tone,
  used,
  limit,
  configured,
}: {
  signature: string;
  language: string;
  tone: string;
  used: number;
  limit: number;
  configured: boolean;
}) {
  const t = useTranslations("settings.ai");
  const tCommon = useTranslations("common");
  const [state, action, pending] = useActionState<
    SettingsState | undefined,
    FormData
  >(updateAiPreferences, undefined);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(t("saved"));
    else if (state.error !== "invalid") toast.error(tCommon("error_generic"));
  }, [state, t, tCommon]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {t("quota_used", { used, limit })}
        </p>
        {!configured ? (
          <p className="text-sm text-muted-foreground">{t("not_configured")}</p>
        ) : null}
        <form action={action} className="space-y-6">
          <FieldGroup>
            <Field data-invalid={errors?.signature ? true : undefined}>
              <FieldLabel htmlFor="ai-signature">{t("signature")}</FieldLabel>
              <Textarea
                id="ai-signature"
                name="signature"
                rows={4}
                defaultValue={signature}
                placeholder={t("signature_placeholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("signature_hint")}
              </p>
              {errors?.signature ? (
                <FieldError>{t("errors.signature")}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel>{t("language")}</FieldLabel>
              <Select name="language" defaultValue={language}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_LANGUAGES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`language_${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t("tone")}</FieldLabel>
              <Select name="tone" defaultValue={tone}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`tone_${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <Button type="submit" size="sm" disabled={pending}>
            {tCommon("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
