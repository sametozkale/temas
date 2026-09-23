"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { File01Icon, InformationCircleIcon } from "@/components/icons";
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
};

export function TemplateEditor({
  template,
}: {
  template: EditorTemplate | null;
}) {
  const t = useTranslations("settings.templates");
  const tc = useTranslations("common");
  const router = useRouter();
  const [name, setName] = React.useState(template?.name ?? "");
  const [body, setBody] = React.useState(
    template?.bodyMd ?? NEW_TEMPLATE_BODY,
  );
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);
  const [confirmRestore, setConfirmRestore] = React.useState(false);
  const [restoring, startRestore] = React.useTransition();
  const [state, action, pending] = useActionState<
    TemplateState | undefined,
    FormData
  >(saveContractTemplate, undefined);

  React.useEffect(() => {
    setName(template?.name ?? "");
    setBody(template?.bodyMd ?? NEW_TEMPLATE_BODY);
  }, [template?.id, template?.name, template?.bodyMd]);

  const starter = template ? starterTemplateByName(template.name) : undefined;
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  React.useEffect(() => {
    if (!state?.ok) return;
    toast.success(t("saved"));
    if (!template && state.data?.id) {
      router.replace(`/settings/templates/${state.data.id}`);
      return;
    }
    router.refresh();
  }, [state, t, template, router]);

  React.useEffect(() => {
    if (!state || state.ok) return;
    if (state.error === "forbidden") toast.error(t("errors.forbidden"));
    else if (state.error !== "invalid") toast.error(t("errors.generic"));
  }, [state, t]);

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
    if (!template) return;
    startRestore(async () => {
      const res = await restoreContractTemplate(template.id);
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
      <form action={action}>
        <SettingsGroup
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
                size="sm"
                disabled={pending || restoring}
              >
                {t("save")}
              </Button>
            </div>
          }
          footer={t("editor_hint")}
        >
          {template ? (
            <input type="hidden" name="id" value={template.id} />
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
            icon={InformationCircleIcon}
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
