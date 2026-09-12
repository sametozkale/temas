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
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

import { updateNotificationPreferences, type SettingsState } from "../actions";

export function NotificationsForm({
  digestEnabled,
}: {
  digestEnabled: boolean;
}) {
  const t = useTranslations("settings.notifications");
  const [enabled, setEnabled] = React.useState(digestEnabled);
  const [state, action, pending] = useActionState<
    SettingsState | undefined,
    FormData
  >(updateNotificationPreferences, undefined);

  React.useEffect(() => {
    if (state?.ok) toast.success(t("saved"));
  }, [state, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("digest_title")}</CardTitle>
        <CardDescription>{t("digest_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input
            type="hidden"
            name="digestEnabled"
            value={enabled ? "true" : "false"}
          />
          <Field orientation="horizontal">
            <FieldLabel htmlFor="digest-enabled">
              {t("digest_label")}
            </FieldLabel>
            <Switch
              id="digest-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </Field>
          <Button type="submit" size="sm" disabled={pending}>
            {t("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
