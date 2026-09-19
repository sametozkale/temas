"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { deleteThread, renameThread } from "@/app/(app)/home/actions";
import {
  Delete02Icon,
  Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ThreadMenu({
  threadId,
  title,
  onRenamed,
}: {
  threadId: string;
  title: string | null;
  onRenamed: (title: string) => void;
}) {
  const t = useTranslations("home.thread");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(title ?? "");

  React.useEffect(() => {
    if (renameOpen) setDraft(title ?? "");
  }, [renameOpen, title]);

  function saveName(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const res = await renameThread(threadId, draft);
      if (!res.ok) {
        toast.error(
          res.error === "not_found" ? t("not_found") : t("invalid_title"),
        );
        return;
      }
      if (res.data?.title) onRenamed(res.data.title);
      setRenameOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("more")}
            disabled={pending}
            className="shrink-0 text-muted-foreground"
          >
            <Icon icon={MoreHorizontalIcon} size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={() => {
              window.setTimeout(() => setRenameOpen(true), 0);
            }}
          >
            <Icon icon={PencilEdit01Icon} size={16} />
            {t("rename")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              window.setTimeout(() => setDeleteOpen(true), 0);
            }}
          >
            <Icon icon={Delete02Icon} size={16} />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form onSubmit={saveName}>
            <DialogHeader>
              <DialogTitle>{t("rename_title")}</DialogTitle>
              <DialogDescription>{t("rename_description")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <Label htmlFor="thread-title">{t("rename")}</Label>
              <Input
                id="thread-title"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={60}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={pending || !draft.trim()}>
                {tc("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteThread(threadId);
                  if (res && !res.ok) {
                    toast.error(
                      res.error === "not_found"
                        ? t("not_found")
                        : tc("permission_denied"),
                    );
                  }
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
