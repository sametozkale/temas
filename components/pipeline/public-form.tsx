"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { submitPublicForm } from "@/app/(public)/f/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    const missingRequiredSelect = fields.some(
      (field) =>
        field.type === "select" &&
        field.required &&
        !String(data.get(`field_${field.key}`) ?? "").trim(),
    );
    if (missingRequiredSelect) {
      toast.error(t("errors.invalid"));
      return;
    }
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
    <form
      onSubmit={onSubmit}
      className="space-y-6 p-1"
    >
      <FieldGroup>
        <PublicField id="fullName" label={t("full_name")}>
          <Input id="fullName" name="fullName" required autoComplete="name" />
        </PublicField>
        <PublicField id="email" label={t("email")}>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </PublicField>
        <PublicField id="phone" label={t("phone")}>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </PublicField>
        {fields.map((field) => (
          <FormFieldControl key={field.key} field={field} />
        ))}
      </FieldGroup>
      <Button type="submit" size="lg" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}

function PublicField({
  id,
  label,
  helpText,
  children,
}: {
  id?: string;
  label: React.ReactNode;
  helpText?: string | null;
  children: React.ReactNode;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {helpText ? (
        <FieldDescription className="text-xs leading-normal">
          {helpText}
        </FieldDescription>
      ) : null}
    </Field>
  );
}

function FormFieldControl({ field }: { field: FormField }) {
  const name = `field_${field.key}`;
  const required = Boolean(field.required);
  if (field.type === "textarea") {
    return (
      <PublicField id={name} label={field.label} helpText={field.helpText}>
        <Textarea id={name} name={name} required={required} />
      </PublicField>
    );
  }
  if (field.type === "boolean") {
    return <PublicBooleanField field={field} />;
  }
  if (field.type === "multiselect") {
    return <PublicMultiSelectField field={field} />;
  }
  if (field.type === "select") {
    return <PublicSelectField field={field} />;
  }
  if (field.type === "file") {
    return <PublicFileField field={field} />;
  }
  const type =
    field.type === "number"
      ? "number"
      : field.type === "email"
        ? "email"
          : field.type === "date"
          ? "date"
            : field.type === "phone"
              ? "tel"
              : "text";
  return (
    <PublicField id={name} label={field.label} helpText={field.helpText}>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        className={
          type === "date"
            ? "tabular-nums [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-80"
            : undefined
        }
      />
    </PublicField>
  );
}

function PublicBooleanField({ field }: { field: FormField }) {
  const name = `field_${field.key}`;
  const [checked, setChecked] = React.useState(false);

  return (
    <Field>
      {checked ? <input type="hidden" name={name} value="on" /> : null}
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          id={name}
          checked={checked}
          onCheckedChange={(value) => setChecked(value === true)}
        />
        {field.label}
      </label>
      {field.helpText ? (
        <FieldDescription className="text-xs leading-normal">
          {field.helpText}
        </FieldDescription>
      ) : null}
    </Field>
  );
}

function PublicMultiSelectField({ field }: { field: FormField }) {
  const name = `field_${field.key}`;
  const [selected, setSelected] = React.useState<string[]>([]);

  return (
    <Field>
      {selected.map((opt) => (
        <input key={opt} type="hidden" name={name} value={opt} />
      ))}
      <FieldLabel>{field.label}</FieldLabel>
      <div className="space-y-2">
        {(field.options ?? []).map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(opt)}
              onCheckedChange={(value) => {
                setSelected((prev) =>
                  value === true
                    ? [...prev, opt]
                    : prev.filter((item) => item !== opt),
                );
              }}
            />
            {opt}
          </label>
        ))}
      </div>
      {field.helpText ? (
        <FieldDescription className="text-xs leading-normal">
          {field.helpText}
        </FieldDescription>
      ) : null}
    </Field>
  );
}

function PublicFileField({ field }: { field: FormField }) {
  const tc = useTranslations("common");
  const name = `field_${field.key}`;
  const required = Boolean(field.required);

  return (
    <PublicField id={name} label={field.label} helpText={field.helpText}>
      <FileInput
        id={name}
        name={name}
        required={required}
        buttonLabel={tc("choose_file")}
        emptyLabel={tc("no_file_chosen")}
      />
    </PublicField>
  );
}

function PublicSelectField({ field }: { field: FormField }) {
  const t = useTranslations("public_form");
  const name = `field_${field.key}`;
  const required = Boolean(field.required);
  const [value, setValue] = React.useState("");

  return (
    <PublicField id={name} label={field.label} helpText={field.helpText}>
      <input type="hidden" name={name} value={value} />
      <Select
        value={value || undefined}
        onValueChange={setValue}
        required={required}
      >
        <SelectTrigger
          id={name}
          className="w-full"
          aria-required={required || undefined}
        >
          <SelectValue placeholder={t("select_placeholder")} />
        </SelectTrigger>
        <SelectContent position="popper">
          {(field.options ?? []).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </PublicField>
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
