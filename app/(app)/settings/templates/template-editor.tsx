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
import { Textarea } from "@/components/ui/textarea";

import { saveContractTemplate, type TemplateState } from "./actions";

export function TemplateEditor({
  templates,
}: {
  templates: { id: string; name: string; bodyMd: string }[];
}) {
  const t = useTranslations("settings.templates");
  const [selectedId, setSelectedId] = React.useState(templates[0]?.id ?? "");
  const selected =
    templates.find((row) => row.id === selectedId) ?? templates[0] ?? null;
  const [state, action, pending] = useActionState<
    TemplateState | undefined,
    FormData
  >(saveContractTemplate, undefined);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(t("saved"));
    else if (state.error === "forbidden") toast.error(t("errors.forbidden"));
    else if (state.error !== "invalid") toast.error(t("errors.generic"));
  }, [state, t]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t("list_title")}</CardTitle>
          <CardDescription>{t("list_description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {templates.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelectedId(row.id)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                row.id === selected?.id
                  ? "bg-muted font-medium"
                  : "hover:bg-muted/60"
              }`}
            >
              {row.name}
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{selected ? selected.name : t("new_title")}</CardTitle>
          <CardDescription>{t("editor_hint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            {selected ? (
              <input type="hidden" name="id" value={selected.id} />
            ) : null}
            <FieldGroup>
              <Field data-invalid={errors?.name ? true : undefined}>
                <FieldLabel htmlFor="template-name">{t("name")}</FieldLabel>
                <Input
                  id="template-name"
                  name="name"
                  key={selected?.id ?? "new"}
                  defaultValue={selected?.name ?? ""}
                  required
                />
                {errors?.name ? (
                  <FieldError>{t("errors.name")}</FieldError>
                ) : null}
              </Field>
              <Field data-invalid={errors?.bodyMd ? true : undefined}>
                <FieldLabel htmlFor="template-body">{t("body")}</FieldLabel>
                <Textarea
                  id="template-body"
                  name="bodyMd"
                  key={`${selected?.id ?? "new"}-body`}
                  rows={18}
                  defaultValue={selected?.bodyMd ?? ""}
                  required
                  className="font-mono text-sm"
                />
                {errors?.bodyMd ? (
                  <FieldError>{t("errors.body")}</FieldError>
                ) : null}
              </Field>
            </FieldGroup>
            <Button type="submit" size="sm" disabled={pending}>
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
