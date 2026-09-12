"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";

import { Icon, Loading03Icon, Mail01Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { sendMagicLink, type MagicLinkState } from "./actions";

type Props = {
  next?: string;
  defaultEmail?: string;
  mailpitUrl?: string;
  /** Error key forwarded from /auth/callback (e.g. "link_invalid"). */
  initialError?: string;
};

export function LoginForm({
  next,
  defaultEmail,
  mailpitUrl,
  initialError,
}: Props) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<
    MagicLinkState | undefined,
    FormData
  >(sendMagicLink, undefined);

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
          <Icon icon={Mail01Icon} size={20} />
        </div>
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-medium tracking-tight">
            {t("check_email_title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("check_email_description", { email: state.data?.email ?? "" })}
          </p>
        </div>
        {mailpitUrl ? (
          <p className="text-xs text-muted-foreground">
            {t("dev_mailpit_hint")}{" "}
            <a
              className="underline underline-offset-2"
              href={mailpitUrl}
              target="_blank"
              rel="noreferrer"
            >
              {mailpitUrl}
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  const errorKey = state && !state.ok ? state.error : (initialError ?? null);

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-2xl font-medium tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field data-invalid={errorKey ? true : undefined}>
        <FieldLabel htmlFor="email">{t("email_label")}</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          defaultValue={defaultEmail}
          placeholder="ad@ornek.com"
        />
        {errorKey ? <FieldError>{t(`errors.${errorKey}`)}</FieldError> : null}
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
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
