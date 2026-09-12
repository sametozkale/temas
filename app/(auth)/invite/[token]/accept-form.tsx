"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Icon, Loading03Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { acceptInvite, type AcceptInviteState } from "./actions";

export function AcceptInviteForm({
  token,
  needsName,
}: {
  token: string;
  needsName: boolean;
}) {
  const t = useTranslations("invite");
  const [state, action, pending] = useActionState<
    AcceptInviteState | undefined,
    FormData
  >(acceptInvite, undefined);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="token" value={token} />
      {needsName ? (
        <Field>
          <FieldLabel htmlFor="fullName">{t("full_name")}</FieldLabel>
          <Input
            id="fullName"
            name="fullName"
            required
            autoFocus
            autoComplete="name"
          />
        </Field>
      ) : null}
      {state && !state.ok ? (
        <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Icon
            icon={Loading03Icon}
            size={16}
            className="animate-spin"
            data-icon="inline-start"
          />
        ) : null}
        {t("accept")}
      </Button>
    </form>
  );
}
