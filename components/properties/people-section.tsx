"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { moveApplication } from "@/app/(app)/properties/[id]/applications/actions";
import { EmptyState } from "@/components/empty-state";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Copy01Icon,
  Delete02Icon,
  Icon,
  Link01Icon,
  Mail01Icon,
  MoreHorizontalIcon,
  PlusSignIcon,
  SmartPhone01Icon,
  Tick02Icon,
  UserAdd01Icon,
} from "@/components/icons";
import { PersonAvatar } from "@/components/identity-marks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export type ProspectRow = {
  applicationId: string;
  stageName: string | null;
  score: number | null;
  memberLine: string | null;
  canShortlist: boolean;
  canReject: boolean;
  canMakeTenant: boolean;
  contact: {
    fullName: string;
    email: string | null;
    phone: string | null;
  };
};

export function PeopleSection({
  propertyId,
  people,
  prospects,
  canEdit,
  canManagePipeline,
  shortlistStageId,
  rejectStageId,
}: {
  propertyId: string;
  people: PersonRow[];
  prospects: ProspectRow[];
  canEdit: boolean;
  canManagePipeline: boolean;
  shortlistStageId: string | null;
  rejectStageId: string | null;
}) {
  const t = useTranslations("properties.people");
  const [open, setOpen] = React.useState(false);

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

      {people.length === 0 && prospects.length === 0 ? (
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
            <li key={p.id} className="min-w-0">
              <PersonCard
                propertyId={propertyId}
                person={p}
                canEdit={canEdit}
              />
            </li>
          ))}
          {prospects.map((prospect) => (
            <li key={prospect.applicationId} className="min-w-0">
              <ProspectCard
                propertyId={propertyId}
                prospect={prospect}
                canEdit={canEdit}
                canManagePipeline={canManagePipeline}
                shortlistStageId={shortlistStageId}
                rejectStageId={rejectStageId}
              />
            </li>
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

/** Shared people-card frame: name owns the title row, contact stacks, meta sits on the foot. */
function PeopleCard({
  name,
  email,
  phone,
  memberLine,
  badge,
  meta,
  menu,
}: {
  name: string;
  email: string | null;
  phone: string | null;
  memberLine?: string | null;
  badge: React.ReactNode;
  meta?: React.ReactNode;
  menu?: React.ReactNode;
}) {
  const t = useTranslations("properties.people");
  return (
    <Card className="h-full py-0">
      <CardContent className="flex h-full items-start gap-3 p-4">
        <PersonAvatar
          initials={initialsOf(name)}
          className="size-9 shrink-0 text-[13px]"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 items-center gap-1">
            <p
              className="min-w-0 flex-1 truncate text-sm font-medium"
              title={name}
            >
              {name}
            </p>
            {menu}
          </div>
          <div className="space-y-0.5">
            {email ? (
              <p
                className="truncate text-xs text-muted-foreground"
                title={email}
              >
                {email}
              </p>
            ) : null}
            {phone ? (
              <p className="truncate text-xs text-muted-foreground">{phone}</p>
            ) : null}
            {!email && !phone ? (
              <p className="text-xs text-muted-foreground">{t("no_account")}</p>
            ) : null}
            {memberLine ? (
              <p
                className="truncate text-xs text-muted-foreground"
                title={memberLine}
              >
                {memberLine}
              </p>
            ) : null}
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-1 pt-2">
            {badge}
            {meta}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PersonCard({
  propertyId,
  person,
  canEdit,
}: {
  propertyId: string;
  person: PersonRow;
  canEdit: boolean;
}) {
  const t = useTranslations("properties.people");
  const router = useRouter();
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

  function createInvite() {
    startTransition(async () => {
      const res = await generatePersonInviteLink(propertyId, person.id);
      if (res.ok && res.data) {
        await copyToClipboard(res.data.url, t("copied"));
        router.refresh();
        return;
      }
      toast.error(t("errors.duplicate"));
    });
  }

  function unlink() {
    startTransition(async () => {
      const res = await removePropertyPerson(propertyId, person.id);
      if (res.ok) toast.success(t("removed"));
      router.refresh();
    });
  }

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
    <PeopleCard
      name={person.contact.fullName}
      email={person.contact.email}
      phone={person.contact.phone}
      badge={
        <Badge variant={person.relation === "owner" ? "brand" : "info"}>
          {t(`relations.${person.relation}`)}
        </Badge>
      }
      meta={
        <span className="text-xs text-muted-foreground">{statusLine}</span>
      }
      menu={
        canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("more")}
                disabled={pending}
              >
                <Icon icon={MoreHorizontalIcon} size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              {hasInvite && !expired ? (
                <DropdownMenuItem onSelect={() => void copyExisting()}>
                  <Icon icon={Copy01Icon} size={16} data-icon="inline-start" />
                  {t("copy_link")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={Boolean(person.joinedAt)}
                  onSelect={createInvite}
                >
                  <Icon icon={Link01Icon} size={16} data-icon="inline-start" />
                  {person.inviteToken
                    ? t("regenerate_link")
                    : t("generate_link")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={unlink}>
                <Icon icon={Delete02Icon} size={16} data-icon="inline-start" />
                {t("remove")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null
      }
    />
  );
}

function ProspectCard({
  propertyId,
  prospect,
  canEdit,
  canManagePipeline,
  shortlistStageId,
  rejectStageId,
}: {
  propertyId: string;
  prospect: ProspectRow;
  canEdit: boolean;
  canManagePipeline: boolean;
  shortlistStageId: string | null;
  rejectStageId: string | null;
}) {
  const t = useTranslations("properties.people");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [confirmReject, setConfirmReject] = React.useState(false);
  const contact = prospect.contact;

  function move(stageId: string, done: string) {
    startTransition(async () => {
      const res = await moveApplication(
        propertyId,
        prospect.applicationId,
        stageId,
      );
      if (res.ok) toast.success(done);
      else toast.error(t("errors.stage"));
      router.refresh();
    });
  }

  function makeTenant() {
    startTransition(async () => {
      const form = new FormData();
      form.set("relation", "current_tenant");
      form.set("fullName", contact.fullName);
      if (contact.email) form.set("email", contact.email);
      if (contact.phone) form.set("phone", contact.phone);
      const res = await addPropertyPerson(propertyId, undefined, form);
      if (res.ok) toast.success(t("made_tenant"));
      else toast.error(t("errors.duplicate"));
      router.refresh();
    });
  }

  const canMakeTenant = canEdit && prospect.canMakeTenant;

  return (
    <>
      <PeopleCard
        name={contact.fullName}
        email={contact.email}
        phone={contact.phone}
        memberLine={prospect.memberLine}
        badge={<Badge variant="secondary">{t("relations.prospect")}</Badge>}
      meta={
        <span className="inline-flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {prospect.stageName ?? t("prospect_status")}
          </span>
          {prospect.score != null ? (
            <Badge variant="info">{prospect.score}</Badge>
          ) : null}
        </span>
      }
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("more")}
                disabled={pending}
              >
                <Icon icon={MoreHorizontalIcon} size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem asChild>
                <Link href={`/properties/${propertyId}/pipeline`}>
                  <Icon
                    icon={ArrowRight01Icon}
                    size={16}
                    data-icon="inline-start"
                  />
                  {t("open_pipeline")}
                </Link>
              </DropdownMenuItem>
              {contact.email ? (
                <DropdownMenuItem
                  onSelect={() =>
                    void copyToClipboard(contact.email!, t("email_copied"))
                  }
                >
                  <Icon icon={Mail01Icon} size={16} data-icon="inline-start" />
                  {t("copy_email")}
                </DropdownMenuItem>
              ) : null}
              {contact.phone ? (
                <DropdownMenuItem
                  onSelect={() =>
                    void copyToClipboard(contact.phone!, t("phone_copied"))
                  }
                >
                  <Icon
                    icon={SmartPhone01Icon}
                    size={16}
                    data-icon="inline-start"
                  />
                  {t("copy_phone")}
                </DropdownMenuItem>
              ) : null}
              {canManagePipeline &&
              prospect.canShortlist &&
              shortlistStageId ? (
                <DropdownMenuItem
                  onSelect={() =>
                    move(shortlistStageId, t("shortlisted_toast"))
                  }
                >
                  <Icon icon={Tick02Icon} size={16} data-icon="inline-start" />
                  {t("shortlist")}
                </DropdownMenuItem>
              ) : null}
              {canMakeTenant ? (
                <DropdownMenuItem onSelect={makeTenant}>
                  <Icon
                    icon={UserAdd01Icon}
                    size={16}
                    data-icon="inline-start"
                  />
                  {t("make_tenant")}
                </DropdownMenuItem>
              ) : null}
              {canManagePipeline && prospect.canReject && rejectStageId ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setConfirmReject(true)}
                  >
                    <Icon
                      icon={Cancel01Icon}
                      size={16}
                      data-icon="inline-start"
                    />
                    {t("reject")}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("reject_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("reject_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (rejectStageId) move(rejectStageId, t("rejected_toast"));
              }}
            >
              {t("reject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
