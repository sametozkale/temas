"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import {
  File01Icon,
  Icon,
  InformationCircleIcon,
  PlusSignIcon,
  Tick02Icon,
} from "@/components/icons";
import {
  SettingsGroup,
  SettingsItem,
} from "@/components/settings/settings-chrome";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTRACT_PLACEHOLDERS,
  PLACEHOLDER_GROUPS,
  TEMPLATE_KIND_ORDER,
  type TemplateKindOrCustom,
} from "@/lib/contracts/placeholders";
import { NEW_TEMPLATE_BODY, starterTemplateByName } from "@/lib/contracts/seed";

import {
  restoreContractTemplate,
  saveContractTemplate,
  type TemplateState,
} from "./actions";

export type EditorTemplate = {
  id: string;
  name: string;
  bodyMd: string;
  kind: TemplateKindOrCustom;
};

export function TemplateEditor({ templates }: { templates: EditorTemplate[] }) {
  const t = useTranslations("settings.templates");
  const tc = useTranslations("common");
  const router = useRouter();
  const ranked = React.useMemo(() => {
    const rank = new Map(TEMPLATE_KIND_ORDER.map((kind, i) => [kind, i]));
    return [...templates].sort((a, b) => {
      const diff = (rank.get(a.kind) ?? 99) - (rank.get(b.kind) ?? 99);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }, [templates]);

  const [selectedId, setSelectedId] = React.useState(ranked[0]?.id ?? "");
  const composing = selectedId === "";
  const selected = composing
    ? null
    : (ranked.find((row) => row.id === selectedId) ?? ranked[0] ?? null);
  const [name, setName] = React.useState(selected?.name ?? "");
  const [body, setBody] = React.useState(selected?.bodyMd ?? NEW_TEMPLATE_BODY);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);
  const [confirmRestore, setConfirmRestore] = React.useState(false);
  const [restoring, startRestore] = React.useTransition();
  const [state, action, pending] = useActionState<
    TemplateState | undefined,
    FormData
  >(saveContractTemplate, undefined);

  const selectedIdSync = selected?.id ?? "";
  const selectedName = selected?.name ?? "";
  const selectedBody = selected?.bodyMd ?? "";

  React.useEffect(() => {
    if (!selectedIdSync) {
      setName("");
      setBody(NEW_TEMPLATE_BODY);
      return;
    }
    setName(selectedName);
    setBody(selectedBody);
  }, [selectedIdSync, selectedName, selectedBody]);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t("saved"));
      if (state.data?.id) setSelectedId(state.data.id);
      return;
    }
    if (state.error === "forbidden") toast.error(t("errors.forbidden"));
    else if (state.error !== "invalid") toast.error(t("errors.generic"));
  }, [state, t]);

  const starter = selected ? starterTemplateByName(selected.name) : undefined;
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  function insertPlaceholder(key: string) {
    const token = `{{${key}}}`;
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => `${prev}${token}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function restoreStarter() {
    if (!selected) return;
    startRestore(async () => {
      const res = await restoreContractTemplate(selected.id);
      setConfirmRestore(false);
      if (!res.ok) {
        if (res.error === "forbidden") toast.error(t("errors.forbidden"));
        else if (res.error === "not_starter") {
          toast.error(t("errors.not_starter"));
        } else toast.error(t("errors.generic"));
        return;
      }
      toast.success(t("restored"));
      router.refresh();
    });
  }

  return (
    <>
      <SettingsItem
        icon={InformationCircleIcon}
        title={t("intro_title")}
        control="below"
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>
      </SettingsItem>

      <SettingsGroup
        title={t("list_title")}
        action={
          <Button
            type="button"
            variant="pill"
            size="sm"
            onClick={() => setSelectedId("")}
            disabled={composing}
          >
            <Icon icon={PlusSignIcon} size={16} />
            {t("new")}
          </Button>
        }
        footer={t("list_description")}
      >
        {ranked.map((row) => {
          const active = !composing && row.id === selected?.id;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelectedId(row.id)}
              className="w-full text-left"
            >
              <SettingsItem
                icon={File01Icon}
                title={row.name}
                description={t(`kinds.${row.kind}`)}
                className={active ? "bg-muted" : undefined}
              >
                {active ? <Icon icon={Tick02Icon} size={16} /> : null}
              </SettingsItem>
            </button>
          );
        })}
      </SettingsGroup>

      <form action={action}>
        <SettingsGroup
          title={selected ? selected.name : t("new_title")}
          action={
            <div className="flex items-center gap-1">
              {starter ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmRestore(true)}
                  disabled={pending || restoring}
                >
                  {t("restore")}
                </Button>
              ) : null}
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={pending || restoring}
              >
                {t("save")}
              </Button>
            </div>
          }
          footer={t("editor_hint")}
        >
          {selected ? (
            <input type="hidden" name="id" value={selected.id} />
          ) : null}
          <SettingsItem icon={File01Icon} title={t("name")} control="below">
            <Input
              id="template-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              aria-invalid={errors?.name ? true : undefined}
            />
            {errors?.name ? <FieldError>{t("errors.name")}</FieldError> : null}
          </SettingsItem>
          <SettingsItem
            icon={File01Icon}
            title={t("placeholders")}
            description={t("placeholders_hint")}
            control="below"
          >
            <div className="flex flex-col gap-3">
              {PLACEHOLDER_GROUPS.map((group) => (
                <div key={group} className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    {t(`groups.${group}`)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CONTRACT_PLACEHOLDERS.filter(
                      (item) => item.group === group,
                    ).map((item) => (
                      <Button
                        key={item.key}
                        type="button"
                        variant="outline"
                        size="xs"
                        className="font-mono"
                        onClick={() => insertPlaceholder(item.key)}
                      >
                        {item.key}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SettingsItem>
          <SettingsItem icon={File01Icon} title={t("body")} control="below">
            <Textarea
              ref={bodyRef}
              id="template-body"
              name="bodyMd"
              rows={18}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              className="font-mono text-sm"
              aria-invalid={errors?.bodyMd ? true : undefined}
            />
            {errors?.bodyMd ? (
              <FieldError>{t("errors.body")}</FieldError>
            ) : null}
          </SettingsItem>
        </SettingsGroup>
      </form>

      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("restore_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("restore_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                restoreStarter();
              }}
            >
              {t("restore_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
