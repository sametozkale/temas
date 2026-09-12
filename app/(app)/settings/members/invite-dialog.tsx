"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { Icon, PlusSignIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INVITE_ROLES } from "@/lib/roles";

import { inviteMember, type MembersState } from "./actions";

export function InviteDialog() {
  const t = useTranslations("settings.members");
  const tr = useTranslations("roles");
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<
    MembersState | undefined,
    FormData
  >(inviteMember, undefined);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t("invite_sent"));
      setOpen(false);
    } else if (state.error !== "invalid") {
      toast.error(t(`errors.${state.error}`));
    }
  }, [state, t]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Icon icon={PlusSignIcon} size={16} data-icon="inline-start" />
          {t("invite")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="space-y-6">
          <DialogHeader>
            <DialogTitle>{t("invite_title")}</DialogTitle>
            <DialogDescription>{t("invite_description")}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={fieldErrors?.email ? true : undefined}>
              <FieldLabel htmlFor="invite-email">{t("email")}</FieldLabel>
              <Input
                id="invite-email"
                name="email"
                type="email"
                required
                autoFocus
                placeholder="ad@ornek.com"
              />
              {fieldErrors?.email ? (
                <FieldError>{t("errors.invalid_email")}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-role">{t("role")}</FieldLabel>
              <Select name="role" defaultValue="agent">
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {tr(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{t("role_hint")}</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {t("send_invite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
