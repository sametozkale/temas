"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { submitPublicForm } from "@/app/(public)/f/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormField } from "@/lib/db/schema/forms";

export function PublicForm({
  token,
  fields,
  embedded = false,
  onSubmitted,
}: {
  token: string;
  fields: FormField[];
  embedded?: boolean;
  onSubmitted?: () => void;
}) {
  const t = useTranslations("public_form");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [done, setDone] = React.useState(false);
  const [bookingUrl, setBookingUrl] = React.useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await submitPublicForm(token, data);
      if (!res.ok) {
        toast.error(t(`errors.${errorKey(res.error)}`));
        return;
      }
      setBookingUrl(res.data?.bookingUrl ?? null);
      setDone(true);
      toast.success(t("submitted"));
      onSubmitted?.();
      router.refresh();
    });
  }

  if (done && !embedded) {
    return (
      <div className="space-y-4">
        <h2 className="font-serif text-2xl tracking-tight">
          {t("thanks_title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("thanks_body")}</p>
        {bookingUrl ? (
          <Button asChild>
            <a href={bookingUrl}>{t("book_viewing")}</a>
          </Button>
        ) : null}
      </div>
    );
  }

  if (done && embedded) {
    return (
      <p className="text-sm text-muted-foreground">{t("thanks_embedded")}</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fullName">{t("full_name")}</FieldLabel>
          <Input id="fullName" name="fullName" required autoComplete="name" />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">{t("phone")}</FieldLabel>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        {fields.map((field) => (
          <FormFieldControl key={field.key} field={field} />
        ))}
      </FieldGroup>
      <Button type="submit" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}

function FormFieldControl({ field }: { field: FormField }) {
  const name = `field_${field.key}`;
  const required = Boolean(field.required);
  if (field.type === "textarea") {
    return (
      <Field>
        <FieldLabel htmlFor={name}>{field.label}</FieldLabel>
        {field.helpText ? (
          <FieldDescription>{field.helpText}</FieldDescription>
        ) : null}
        <Textarea id={name} name={name} required={required} />
      </Field>
    );
  }
  if (field.type === "boolean") {
    return (
      <Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            id={name}
            name={name}
            type="checkbox"
            className="size-4 rounded border border-input"
          />
          {field.label}
        </label>
        {field.helpText ? (
          <FieldDescription>{field.helpText}</FieldDescription>
        ) : null}
      </Field>
    );
  }
  if (field.type === "multiselect") {
    return (
      <Field>
        <FieldLabel>{field.label}</FieldLabel>
        {field.helpText ? (
          <FieldDescription>{field.helpText}</FieldDescription>
        ) : null}
        <div className="space-y-2">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={name}
                value={opt}
                className="size-4 rounded border border-input"
              />
              {opt}
            </label>
          ))}
        </div>
      </Field>
    );
  }
  if (field.type === "select") {
    return (
      <Field>
        <FieldLabel htmlFor={name}>{field.label}</FieldLabel>
        {field.helpText ? (
          <FieldDescription>{field.helpText}</FieldDescription>
        ) : null}
        <select
          id={name}
          name={name}
          required={required}
          className="h-8 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
          defaultValue=""
        >
          <option value="" disabled>
            —
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  const type =
    field.type === "number"
      ? "number"
      : field.type === "email"
        ? "email"
        : field.type === "date"
          ? "date"
          : field.type === "file"
            ? "file"
            : field.type === "phone"
              ? "tel"
              : "text";
  return (
    <Field>
      <FieldLabel htmlFor={name}>{field.label}</FieldLabel>
      {field.helpText ? (
        <FieldDescription>{field.helpText}</FieldDescription>
      ) : null}
      <Input id={name} name={name} type={type} required={required} />
    </Field>
  );
}

function errorKey(error: string) {
  if (
    error === "invalid" ||
    error === "rate_limited" ||
    error === "not_found"
  ) {
    return error;
  }
  return "generic";
}
