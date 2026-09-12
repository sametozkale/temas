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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIMEZONES } from "@/lib/timezones";

import { updateProfile, updateWorkspace, type SettingsState } from "./actions";

function useSavedToast(state: SettingsState | undefined, message: string) {
  const t = useTranslations("common");
  React.useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(message);
    else if (state.error !== "invalid") toast.error(t("error_generic"));
  }, [state, message, t]);
}

export function WorkspaceForm({
  name,
  timezone,
  canEdit,
}: {
  name: string;
  timezone: string;
  canEdit: boolean;
}) {
  const t = useTranslations("settings.general");
  const [state, action, pending] = useActionState<
    SettingsState | undefined,
    FormData
  >(updateWorkspace, undefined);
  useSavedToast(state, t("saved"));
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("workspace_title")}</CardTitle>
        <CardDescription>{t("workspace_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          <FieldGroup>
            <Field data-invalid={errors?.name ? true : undefined}>
              <FieldLabel htmlFor="ws-name">{t("workspace_name")}</FieldLabel>
              <Input
                id="ws-name"
                name="name"
                defaultValue={name}
                disabled={!canEdit}
                required
              />
              {errors?.name ? (
                <FieldError>{t("errors.name")}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="ws-tz">{t("timezone")}</FieldLabel>
              <Select
                name="timezone"
                defaultValue={timezone}
                disabled={!canEdit}
              >
                <SelectTrigger id="ws-tz" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          {canEdit ? (
            <Button type="submit" size="sm" disabled={pending}>
              {t("save")}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">{t("owner_only")}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

export function ProfileForm({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string;
  email: string;
}) {
  const t = useTranslations("settings.general");
  const [state, action, pending] = useActionState<
    SettingsState | undefined,
    FormData
  >(updateProfile, undefined);
  useSavedToast(state, t("saved"));
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile_title")}</CardTitle>
        <CardDescription>{t("profile_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          <FieldGroup>
            <Field data-invalid={errors?.fullName ? true : undefined}>
              <FieldLabel htmlFor="p-name">{t("full_name")}</FieldLabel>
              <Input
                id="p-name"
                name="fullName"
                defaultValue={fullName}
                required
              />
              {errors?.fullName ? (
                <FieldError>{t("errors.full_name")}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="p-email">{t("email")}</FieldLabel>
              <Input id="p-email" value={email} disabled readOnly />
            </Field>
            <Field>
              <FieldLabel htmlFor="p-phone">{t("phone")}</FieldLabel>
              <Input
                id="p-phone"
                name="phone"
                defaultValue={phone}
                placeholder="+90 5xx xxx xx xx"
              />
            </Field>
          </FieldGroup>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {t("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
