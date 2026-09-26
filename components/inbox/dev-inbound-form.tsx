"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  connectWhatsAppDev,
  disconnectGmail,
  disconnectWhatsApp,
  injectInbound,
  injectWhatsApp,
  type IntegrationsState,
} from "@/app/(app)/settings/integrations/actions";

export function DevInboundForm({
  defaultFromName = "Elif Yılmaz",
  defaultFromEmail = "elif@temas.test",
  defaultSubject = "Kadıköy bright 2+1 viewing",
}: {
  defaultFromName?: string;
  defaultFromEmail?: string;
  defaultSubject?: string;
}) {
  const t = useTranslations("settings.integrations");
  const [state, action, pending] = useActionState<
    IntegrationsState | undefined,
    FormData
  >(injectInbound, undefined);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(t("inject_sent"));
    else if (state.error === "forbidden") toast.error(t("errors.forbidden"));
    else if (state.error === "not_connected") {
      toast.error(t("errors.not_connected"));
    } else if (state.error === "rate_limited") {
      toast.error(t("errors.rate_limited"));
    } else if (state.error !== "invalid") toast.error(t("errors.generic"));
  }, [state, t]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={errors?.fromName ? true : undefined}>
            <FieldLabel htmlFor="from-name">{t("from_name")}</FieldLabel>
            <Input
              id="from-name"
              name="fromName"
              defaultValue={defaultFromName}
              required
            />
            {errors?.fromName ? (
              <FieldError>{t("errors.from_name")}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={errors?.fromEmail ? true : undefined}>
            <FieldLabel htmlFor="from-email">{t("from_email")}</FieldLabel>
            <Input
              id="from-email"
              name="fromEmail"
              type="email"
              defaultValue={defaultFromEmail}
              required
            />
            {errors?.fromEmail ? (
              <FieldError>{t("errors.from_email")}</FieldError>
            ) : null}
          </Field>
        </div>
        <Field data-invalid={errors?.subject ? true : undefined}>
          <FieldLabel htmlFor="inject-subject">{t("subject")}</FieldLabel>
          <Input
            id="inject-subject"
            name="subject"
            defaultValue={defaultSubject}
            required
          />
          {errors?.subject ? (
            <FieldError>{t("errors.subject")}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={errors?.body ? true : undefined}>
          <FieldLabel htmlFor="inject-body">{t("body")}</FieldLabel>
          <Textarea
            id="inject-body"
            name="body"
            rows={5}
            defaultValue={t("inject_body_default")}
            required
          />
          {errors?.body ? <FieldError>{t("errors.body")}</FieldError> : null}
        </Field>
      </FieldGroup>
      <Button type="submit" size="sm" disabled={pending}>
        {t("inject_submit")}
      </Button>
    </form>
  );
}

export function DisconnectButton() {
  const t = useTranslations("settings.integrations");
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const result = await disconnectGmail();
          if (result.ok) toast.success(t("disconnected"));
          else toast.error(t("errors.generic"));
        } finally {
          setPending(false);
        }
      }}
    >
      {t("disconnect")}
    </Button>
  );
}

export function WhatsAppInboundForm() {
  const t = useTranslations("settings.integrations");
  const [state, action, pending] = useActionState<
    IntegrationsState | undefined,
    FormData
  >(injectWhatsApp, undefined);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(t("inject_wa_sent"));
    else if (state.error === "forbidden") toast.error(t("errors.forbidden"));
    else if (state.error === "not_connected") {
      toast.error(t("errors.not_connected"));
    } else if (state.error === "rate_limited") {
      toast.error(t("errors.rate_limited"));
    } else if (state.error !== "invalid") toast.error(t("errors.generic"));
  }, [state, t]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={errors?.fromName ? true : undefined}>
            <FieldLabel htmlFor="wa-from-name">{t("from_name")}</FieldLabel>
            <Input
              id="wa-from-name"
              name="fromName"
              defaultValue="Elif Kaya"
              required
            />
          </Field>
          <Field data-invalid={errors?.fromPhone ? true : undefined}>
            <FieldLabel htmlFor="wa-from-phone">{t("from_phone")}</FieldLabel>
            <Input
              id="wa-from-phone"
              name="fromPhone"
              defaultValue="+905321110000"
              required
            />
            {errors?.fromPhone ? (
              <FieldError>{t("errors.from_phone")}</FieldError>
            ) : null}
          </Field>
        </div>
        <Field data-invalid={errors?.body ? true : undefined}>
          <FieldLabel htmlFor="wa-body">{t("body")}</FieldLabel>
          <Textarea
            id="wa-body"
            name="body"
            rows={4}
            defaultValue={t("inject_wa_body_default")}
            required
          />
        </Field>
      </FieldGroup>
      <Button type="submit" size="sm" disabled={pending}>
        {t("inject_wa_submit")}
      </Button>
    </form>
  );
}

export function ConnectWhatsAppButton({
  label,
  variant = "outline",
}: {
  label?: string;
  variant?: "outline" | "default";
}) {
  const t = useTranslations("settings.integrations");
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const result = await connectWhatsAppDev();
          if (result.ok) toast.success(t("whatsapp_connected_toast"));
          else toast.error(t("errors.generic"));
        } finally {
          setPending(false);
        }
      }}
    >
      {label ?? t("connect_whatsapp")}
    </Button>
  );
}

export function DisconnectWhatsAppButton() {
  const t = useTranslations("settings.integrations");
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const result = await disconnectWhatsApp();
          if (result.ok) toast.success(t("whatsapp_disconnected"));
          else toast.error(t("errors.generic"));
        } finally {
          setPending(false);
        }
      }}
    >
      {t("disconnect")}
    </Button>
  );
}
