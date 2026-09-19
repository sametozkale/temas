"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Icon, Loading03Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/timezone-select";

import { createWorkspace, type OnboardingState } from "./actions";

export function OnboardingForm({
  defaultEmail,
}: {
  defaultEmail: string | null;
}) {
  const t = useTranslations("onboarding");
  const [state, action, pending] = useActionState<
    OnboardingState | undefined,
    FormData
  >(createWorkspace, undefined);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-serif text-xl font-medium tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("description", { email: defaultEmail ?? "" })}
        </p>
      </div>

      <FieldGroup>
        <Field data-invalid={fieldErrors?.fullName ? true : undefined}>
          <FieldLabel htmlFor="fullName">{t("full_name")}</FieldLabel>
          <Input
            id="fullName"
            name="fullName"
            required
            autoFocus
            autoComplete="name"
          />
          {fieldErrors?.fullName ? (
            <FieldError>{t("errors.full_name")}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={fieldErrors?.workspaceName ? true : undefined}>
          <FieldLabel htmlFor="workspaceName">{t("workspace_name")}</FieldLabel>
          <Input
            id="workspaceName"
            name="workspaceName"
            required
            placeholder={t("workspace_placeholder")}
          />
          <FieldDescription>{t("workspace_hint")}</FieldDescription>
          {fieldErrors?.workspaceName ? (
            <FieldError>{t("errors.workspace_name")}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="timezone">{t("timezone")}</FieldLabel>
          <TimezoneSelect id="timezone" name="timezone" />
        </Field>
      </FieldGroup>

      {state && !state.ok && !fieldErrors ? (
        <FieldError>
          {state.error === "session_mismatch"
            ? t("errors.session_mismatch")
            : t("errors.create_failed")}
        </FieldError>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? (
          <Icon
            icon={Loading03Icon}
            size={16}
            className="animate-spin"
            data-icon="inline-start"
          />
        ) : null}
        {t("submit")}
      </Button>
    </form>
  );
}
