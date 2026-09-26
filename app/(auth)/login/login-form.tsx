"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import * as React from "react";
import { useActionState } from "react";

import { Icon, Loading03Icon, Mail01Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PLANS, formatUsd } from "@/lib/plans";

import { sendMagicLink, type MagicLinkState } from "./actions";

type Props = {
  next?: string;
  defaultEmail?: string;
  mailpitUrl?: string;
  /** Error key forwarded from /auth/callback (e.g. "link_invalid"). */
  initialError?: string;
  /** Wording only: the same magic link signs in or creates the account. */
  intent?: "signin" | "signup";
};

function loginHref(intent: "signin" | "signup", next?: string) {
  const params = new URLSearchParams();
  if (intent === "signup") params.set("intent", "signup");
  if (next && next !== "/home") params.set("next", next);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function LoginForm({
  next,
  defaultEmail,
  mailpitUrl,
  initialError,
  intent = "signin",
}: Props) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<
    MagicLinkState | undefined,
    FormData
  >(sendMagicLink, undefined);
  const signup = intent === "signup";

  if (state?.ok) {
    return (
      <div>
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-foreground">
          <Icon icon={Mail01Icon} size={20} />
        </div>
        <h1 className="mt-6 font-serif text-4xl leading-[1.05] font-normal tracking-tight">
          {t("check_email_title")}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {t("check_email_description", { email: state.data?.email ?? "" })}
        </p>
        {mailpitUrl ? (
          <p className="mt-6 text-xs text-muted-foreground">
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
        <a
          href={loginHref(intent, next)}
          className="mt-8 inline-block text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t("use_different_email")}
        </a>
      </div>
    );
  }

  const errorKey = state && !state.ok ? state.error : (initialError ?? null);

  return (
    <div>
      <form action={action}>
        <h1 className="font-serif text-4xl leading-[1.05] font-normal tracking-tight">
          {signup ? t("signup_title") : t("title")}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {signup ? t("signup_description") : t("description")}
        </p>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Field data-invalid={errorKey ? true : undefined} className="mt-8">
          <FieldLabel htmlFor="email">{t("email_label")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            defaultValue={defaultEmail}
            placeholder={t("email_placeholder")}
          />
          {errorKey ? <FieldError>{t(`errors.${errorKey}`)}</FieldError> : null}
        </Field>
        <Button
          type="submit"
          size="lg"
          className="mt-5 w-full"
          disabled={pending}
        >
          {pending ? (
            <Icon
              icon={Loading03Icon}
              size={16}
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : null}
          {signup ? t("signup_submit") : t("submit")}
        </Button>
        {signup ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t("signup_note", {
              amount: formatUsd(PLANS.free.price.annualMonthlyCents),
            })}
          </p>
        ) : null}
      </form>
      <p className="mt-10 border-t pt-6 text-sm text-muted-foreground">
        {signup ? t("to_signin_prompt") : t("to_signup_prompt")}{" "}
        <Link
          href={loginHref(signup ? "signin" : "signup", next)}
          className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {signup ? t("to_signin") : t("to_signup")}
        </Link>
      </p>
    </div>
  );
}
