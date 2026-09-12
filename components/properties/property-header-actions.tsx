"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import {
  changePropertyStatus,
  deleteProperty,
} from "@/app/(app)/properties/actions";
import {
  ArrowRight01Icon,
  Delete02Icon,
  Edit02Icon,
  Icon,
  MoreHorizontalIcon,
} from "@/components/icons";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PropertyStatus } from "@/lib/db/schema";
import { nextStatuses } from "@/lib/properties/status";

export function PropertyHeaderActions({
  propertyId,
  status,
  canWrite,
  canDelete,
}: {
  propertyId: string;
  status: PropertyStatus;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("properties.detail");
  const tStatus = useTranslations("properties.status");
  const tc = useTranslations("common");
  const [pending, startTransition] = React.useTransition();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const targets = nextStatuses(status);

  if (!canWrite) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="pill" size="sm" disabled={pending}>
            {t("change_status")}
            <Icon icon={ArrowRight01Icon} size={16} data-icon="inline-end" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {tStatus(status)}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {targets.map((target) => (
            <DropdownMenuItem
              key={target}
              onSelect={() =>
                startTransition(async () => {
                  const res = await changePropertyStatus(propertyId, target);
                  if (res.ok) toast.success(t("status_updated"));
                  else if (
                    res.error === "invalid_transition" ||
                    res.error === "not_found"
                  )
                    toast.error(t(`errors.${res.error}`));
                  else toast.error(t("errors.forbidden"));
                })
              }
            >
              {tStatus(target)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="pill" size="sm" asChild>
        <Link href={`/properties/${propertyId}/edit`}>
          <Icon icon={Edit02Icon} size={16} data-icon="inline-start" />
          {t("edit")}
        </Link>
      </Button>

      {canDelete ? (
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
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              <Icon icon={Delete02Icon} size={16} />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteProperty(propertyId);
                  if (res && !res.ok) toast.error(t("errors.forbidden"));
                })
              }
            >
              {t("delete_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
