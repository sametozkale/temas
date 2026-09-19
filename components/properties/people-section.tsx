"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import {
  addPropertyPerson,
  generatePersonInviteLink,
  removePropertyPerson,
  type PropertyActionResult,
} from "@/app/(app)/properties/actions";
import { EmptyState } from "@/components/empty-state";
import {
  Copy01Icon,
  Delete02Icon,
  Icon,
  Link01Icon,
  PlusSignIcon,
  UserAdd01Icon,
} from "@/components/icons";
import { PersonAvatar } from "@/components/identity-marks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
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
import { initialsOf } from "@/lib/auth-utils";
import { PROPERTY_RELATIONS, type PropertyRelation } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";

async function copyToClipboard(text: string, success: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(success);
  } catch {
    toast.success(success, { description: text });
  }
}

export type PersonRow = {
  id: string;
  relation: PropertyRelation;
  inviteToken: string | null;
  inviteExpiresAt: string | null;
  joinedAt: string | null;
  contact: {
    fullName: string;
    email: string | null;
    phone: string | null;
    userId: string | null;
  };
};

export function PeopleSection({
  propertyId,
  people,
  canEdit,
}: {
  propertyId: string;
  people: PersonRow[];
  canEdit: boolean;
}) {
  const t = useTranslations("properties.people");
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [, startTransition] = React.useTransition();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        {canEdit ? (
          <Button variant="pill" size="sm" onClick={() => setOpen(true)}>
            <Icon icon={PlusSignIcon} size={16} data-icon="inline-start" />
            {t("add")}
          </Button>
        ) : null}
      </div>

      {people.length === 0 ? (
        <EmptyState
          icon={UserAdd01Icon}
          title={t("empty_title")}
          description={t("empty_description")}
          action={
            canEdit ? (
              <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
                {t("add")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              canEdit={canEdit}
              onUnlink={() =>
                startTransition(async () => {
                  const res = await removePropertyPerson(propertyId, p.id);
                  if (res.ok) toast.success(t("removed"));
                  router.refresh();
                })
              }
              onInvite={async () => {
                const res = await generatePersonInviteLink(propertyId, p.id);
                if (res.ok && res.data) {
                  await copyToClipboard(res.data.url, t("copied"));
                  router.refresh();
                  return res.data.url;
                }
                toast.error(t("errors.duplicate"));
                return null;
              }}
            />
          ))}
        </ul>
      )}

      {open ? (
        <AddPersonDialog
          propertyId={propertyId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function PersonCard({
  person,
  canEdit,
  onUnlink,
  onInvite,
}: {
  person: PersonRow;
  canEdit: boolean;
  onUnlink: () => void;
  onInvite: () => Promise<string | null>;
}) {
  const t = useTranslations("properties.people");
  const [pending, startTransition] = React.useTransition();
  const hasInvite = Boolean(person.inviteToken);
  const expired =
    person.inviteExpiresAt !== null &&
    new Date(person.inviteExpiresAt).getTime() < Date.now();

  async function copyExisting() {
    if (!person.inviteToken) return;
    await copyToClipboard(
      `${window.location.origin}/p/${person.inviteToken}`,
      t("copied"),
    );
  }

  const contactLine =
    [person.contact.email, person.contact.phone]
      .filter(Boolean)
      .join(" · ") || t("no_account");
  const statusLine = person.joinedAt
    ? t("joined")
    : person.inviteToken
      ? expired
        ? t("pending")
        : t("link_expires", {
            date: formatDate(person.inviteExpiresAt!),
          })
      : t("pending");

  return (
    <Card className="py-0">
      <CardContent className="flex items-start gap-3 p-4">
        <PersonAvatar
          initials={initialsOf(person.contact.fullName)}
          className="size-9 text-[13px]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium">
              {person.contact.fullName}
            </p>
            <Badge variant={person.relation === "owner" ? "brand" : "info"}>
              {t(`relations.${person.relation}`)}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {contactLine}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/70">
            {statusLine}
          </p>
          {canEdit ? (
            <div className="-ml-2 mt-2 flex flex-wrap items-center">
              {hasInvite && !expired ? (
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => void copyExisting()}
                >
                  <Icon icon={Copy01Icon} size={16} data-icon="inline-start" />
                  {t("copy_link")}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  disabled={pending || Boolean(person.joinedAt)}
                  onClick={() =>
                    startTransition(async () => {
                      await onInvite();
                    })
                  }
                >
                  <Icon icon={Link01Icon} size={16} data-icon="inline-start" />
                  {person.inviteToken
                    ? t("regenerate_link")
                    : t("generate_link")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={onUnlink}
              >
                <Icon icon={Delete02Icon} size={16} data-icon="inline-start" />
                {t("remove")}
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function AddPersonDialog({
  propertyId,
  onClose,
}: {
  propertyId: string;
  onClose: () => void;
}) {
  const t = useTranslations("properties.people");
  const router = useRouter();
  const action = addPropertyPerson.bind(null, propertyId);
  const [state, formAction, pending] = useActionState<
    PropertyActionResult | undefined,
    FormData
  >(action, undefined);
  const [relation, setRelation] = React.useState<PropertyRelation>("owner");

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(t("saved"));
      router.refresh();
      onClose();
    }
  }, [state, t, router, onClose]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const errorKey = state && !state.ok ? state.error : undefined;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-6">
          <DialogHeader>
            <DialogTitle>{t("add_title")}</DialogTitle>
            <DialogDescription>{t("add_description")}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="person-relation">{t("relation")}</FieldLabel>
              <input type="hidden" name="relation" value={relation} />
              <Select
                value={relation}
                onValueChange={(v) => setRelation(v as PropertyRelation)}
              >
                <SelectTrigger id="person-relation" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_RELATIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`relations.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={errors?.fullName ? true : undefined}>
              <FieldLabel htmlFor="person-name">{t("full_name")}</FieldLabel>
              <Input id="person-name" name="fullName" required autoFocus />
              {errors?.fullName ? (
                <FieldError>{t("errors.full_name")}</FieldError>
              ) : null}
            </Field>
            <Field data-invalid={errors?.email ? true : undefined}>
              <FieldLabel htmlFor="person-email">{t("email")}</FieldLabel>
              <Input id="person-email" name="email" type="email" />
              {errors?.email || errorKey === "contact_required" ? (
                <FieldError>
                  {t(
                    `errors.${errorKey === "contact_required" ? "contact_required" : "email"}`,
                  )}
                </FieldError>
              ) : null}
            </Field>
            <Field data-invalid={errors?.phone ? true : undefined}>
              <FieldLabel htmlFor="person-phone">{t("phone")}</FieldLabel>
              <Input id="person-phone" name="phone" />
              {errors?.phone ? (
                <FieldError>{t("errors.phone")}</FieldError>
              ) : null}
            </Field>
            {errorKey === "duplicate" ? (
              <FieldError>{t("errors.duplicate")}</FieldError>
            ) : null}
          </FieldGroup>
          <p className="text-xs text-muted-foreground">
            {t("magic_link_note")}
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
