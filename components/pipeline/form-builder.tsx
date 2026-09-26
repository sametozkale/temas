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
  Attachment01Icon,
  Calendar01Icon,
  CheckListIcon,
  Copy01Icon,
  Delete02Icon,
  HashtagIcon,
  Mail01Icon,
  Menu02Icon,
  ParagraphIcon,
  SmartPhone01Icon,
  TextFontIcon,
  ToggleOnIcon,
  ViewIcon,
  ViewOffSlashIcon,
  type IconSvgElement,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FormField } from "@/lib/db/schema/forms";
import { FORM_FIELD_TYPES } from "@/lib/pipeline/defaults";

const FIELD_TYPE_ICONS = {
  text: TextFontIcon,
  textarea: ParagraphIcon,
  number: HashtagIcon,
  email: Mail01Icon,
  phone: SmartPhone01Icon,
  date: Calendar01Icon,
  select: Menu02Icon,
  multiselect: CheckListIcon,
  boolean: ToggleOnIcon,
  file: Attachment01Icon,
} as const satisfies Record<FormField["type"], IconSvgElement>;
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
                : [t("option_a"), t("option_b")],
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
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
        <CardAction className="self-start">
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
        </CardAction>
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
          <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5">
            <span
              className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
              title={publicUrl}
            >
              {publicUrl}
            </span>
            <Button
              type="button"
              variant="soft"
              size="xs"
              className="shrink-0"
              onClick={() => void copyLink()}
            >
              <Icon
                icon={Copy01Icon}
                size={16}
                className="size-4"
                data-icon="inline-start"
              />
              {t("copy_link")}
            </Button>
          </div>
        ) : null}
        <div className="grid min-w-0 gap-4 @3xl:grid-cols-[minmax(0,1fr)_280px]">
          <ul className="min-w-0 divide-y rounded-lg border">
            {fields.map((field, index) => (
              <li key={field.key}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 ${
                    selected === field.key ? "bg-accent" : ""
                  } ${field.hidden ? "text-muted-foreground" : ""}`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                    onClick={() => setSelected(field.key)}
                  >
                    <Icon
                      icon={FIELD_TYPE_ICONS[field.type]}
                      size={16}
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="sr-only">{t(`types.${field.type}`)}</span>
                    <span className="min-w-0">
                      <span className="font-medium">{field.label}</span>
                      {field.required || field.hidden ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {field.required ? t("required") : ""}
                          {field.required && field.hidden ? " · " : ""}
                          {field.hidden ? t("hidden") : ""}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  {canManage ? (
                    <div className="flex shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("move_up")}
                        disabled={index === 0}
                        onClick={() => move(field.key, -1)}
                      >
                        <Icon icon={ArrowUp01Icon} size={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("move_down")}
                        disabled={index === fields.length - 1}
                        onClick={() => move(field.key, 1)}
                      >
                        <Icon icon={ArrowDown01Icon} size={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={field.hidden ? t("show") : t("hide")}
                        aria-pressed={Boolean(field.hidden)}
                        onClick={() =>
                          patchField(field.key, { hidden: !field.hidden })
                        }
                      >
                        <Icon
                          icon={field.hidden ? ViewOffSlashIcon : ViewIcon}
                          size={16}
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("remove")}
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
                  <Select
                    value={current.type}
                    disabled={!canManage}
                    onValueChange={(type) =>
                      patchField(current.key, {
                        type: type as FormField["type"],
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {FORM_FIELD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={!current.hidden}
                    disabled={!canManage}
                    onCheckedChange={(v) =>
                      patchField(current.key, { hidden: v !== true })
                    }
                  />
                  {t("show")}
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
