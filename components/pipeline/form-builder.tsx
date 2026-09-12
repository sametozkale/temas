"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { saveForm } from "@/app/(app)/properties/[id]/applications/actions";
import {
  Icon,
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FormField } from "@/lib/db/schema/forms";
import { FORM_FIELD_TYPES } from "@/lib/pipeline/defaults";
import { randomSuffix } from "@/lib/slug";

export function FormBuilder({
  propertyId,
  form,
  publicUrl,
  canManage,
}: {
  propertyId: string;
  form: {
    title: string;
    schema: FormField[];
    isPublished: boolean;
  };
  publicUrl: string | null;
  canManage: boolean;
}) {
  const t = useTranslations("pipeline.form");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [title, setTitle] = React.useState(form.title);
  const [fields, setFields] = React.useState<FormField[]>(form.schema);
  const [published, setPublished] = React.useState(form.isPublished);
  const [selected, setSelected] = React.useState<string | null>(
    form.schema[0]?.key ?? null,
  );

  React.useEffect(() => {
    setTitle(form.title);
    setFields(form.schema);
    setPublished(form.isPublished);
  }, [form]);

  const current = fields.find((f) => f.key === selected) ?? null;

  function patchField(key: string, patch: Partial<FormField>) {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, ...patch } : f)),
    );
  }

  function move(key: string, dir: -1 | 1) {
    setFields((prev) => {
      const i = prev.findIndex((f) => f.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(i, 1);
      next.splice(j, 0, item!);
      return next;
    });
  }

  function addField() {
    const key = `q_${randomSuffix(4)}`;
    const field: FormField = {
      key,
      label: t("new_question"),
      type: "text",
    };
    setFields((prev) => [...prev, field]);
    setSelected(key);
  }

  function removeField(key: string) {
    setFields((prev) => {
      const next = prev.filter((f) => f.key !== key);
      if (selected === key) setSelected(next[0]?.key ?? null);
      return next;
    });
  }

  function save(nextPublished = published) {
    startTransition(async () => {
      const schema = fields.map((f) => {
        if (f.type === "select" || f.type === "multiselect") {
          return {
            ...f,
            options:
              f.options && f.options.length >= 2
                ? f.options
                : ["Option A", "Option B"],
          };
        }
        return f;
      });
      const res = await saveForm(propertyId, {
        title,
        schema,
        isPublished: nextPublished,
      });
      if (!res.ok) toast.error(t("errors.generic"));
      else toast.success(t("saved"));
      router.refresh();
    });
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success(t("copied"));
    } catch {
      toast.success(t("copied"), { description: publicUrl });
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span>{t("published")}</span>
          <Switch
            checked={published}
            disabled={!canManage || pending}
            onCheckedChange={(v) => {
              const next = v === true;
              setPublished(next);
              save(next);
            }}
          />
        </label>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field>
          <FieldLabel>{t("form_title")}</FieldLabel>
          <Input
            value={title}
            disabled={!canManage}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        {publicUrl ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{publicUrl}</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => void copyLink()}
            >
              {t("copy_link")}
            </Button>
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <ul className="divide-y rounded-lg border">
            {fields.map((field, index) => (
              <li key={field.key}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 ${
                    selected === field.key ? "bg-accent" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left text-sm"
                    onClick={() => setSelected(field.key)}
                  >
                    <span className="font-medium">{field.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t(`types.${field.type}`)}
                      {field.required ? ` · ${t("required")}` : ""}
                    </span>
                  </button>
                  {canManage ? (
                    <div className="flex shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === 0}
                        onClick={() => move(field.key, -1)}
                      >
                        <Icon icon={ArrowUp01Icon} size={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === fields.length - 1}
                        onClick={() => move(field.key, 1)}
                      >
                        <Icon icon={ArrowDown01Icon} size={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeField(field.key)}
                      >
                        <Icon icon={Delete02Icon} size={16} />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border p-4">
            {current ? (
              <FieldGroup>
                <Field>
                  <FieldLabel>{t("label")}</FieldLabel>
                  <Input
                    value={current.label}
                    disabled={!canManage}
                    onChange={(e) => {
                      patchField(current.key, { label: e.target.value });
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("type")}</FieldLabel>
                  <select
                    className="h-8 w-full rounded-lg border border-input bg-card px-2.5 text-sm"
                    value={current.type}
                    disabled={!canManage}
                    onChange={(e) =>
                      patchField(current.key, {
                        type: e.target.value as FormField["type"],
                      })
                    }
                  >
                    {FORM_FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`types.${type}`)}
                      </option>
                    ))}
                  </select>
                </Field>
                {current.type === "select" || current.type === "multiselect" ? (
                  <Field>
                    <FieldLabel>{t("options")}</FieldLabel>
                    <Textarea
                      value={(current.options ?? []).join("\n")}
                      disabled={!canManage}
                      onChange={(e) =>
                        patchField(current.key, {
                          options: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </Field>
                ) : null}
                <Field>
                  <FieldLabel>{t("help")}</FieldLabel>
                  <Input
                    value={current.helpText ?? ""}
                    disabled={!canManage}
                    onChange={(e) =>
                      patchField(current.key, { helpText: e.target.value })
                    }
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(current.required)}
                    disabled={!canManage}
                    onCheckedChange={(v) =>
                      patchField(current.key, { required: v === true })
                    }
                  />
                  {t("required")}
                </label>
              </FieldGroup>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("select_field")}
              </p>
            )}
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="soft" onClick={addField}>
              <Icon icon={Add01Icon} size={16} data-icon="inline-start" />
              {t("add_field")}
            </Button>
            <Button type="button" onClick={() => save()} disabled={pending}>
              {t("save")}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
