"use client";

import { useFormatter, useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { Icon, MoreHorizontalIcon } from "@/components/icons";
import { PersonAvatar } from "@/components/identity-marks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { initialsOf } from "@/lib/auth-utils";
import { WORKSPACE_ROLES, type WorkspaceRole } from "@/lib/roles";

import {
  removeMember,
  revokeInvite,
  updateMemberRole,
  type MembersState,
} from "./actions";

type MemberRow = {
  id: string;
  userId: string;
  role: WorkspaceRole;
  fullName: string | null;
  avatarUrl: string | null;
  isSelf: boolean;
  listingCount: number;
};

function useActionToast() {
  const t = useTranslations("settings.members");
  return React.useCallback(
    (result: MembersState, success: string) => {
      if (result.ok) toast.success(success);
      else toast.error(t(`errors.${result.error}`));
    },
    [t],
  );
}

export function MembersTable({
  members,
  canManage,
}: {
  members: MemberRow[];
  canManage: boolean;
}) {
  const t = useTranslations("settings.members");
  const tr = useTranslations("roles");
  const notify = useActionToast();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <span className="inline-flex items-center gap-2">
                {t("col_member")}
                <span
                  className="font-normal text-muted-foreground tabular-nums"
                  aria-label={t("members_count", { count: members.length })}
                >
                  {members.length}
                </span>
              </span>
            </TableHead>
            <TableHead className="w-32">{t("col_role")}</TableHead>
            <TableHead className="w-28">{t("col_listings")}</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const name = m.fullName ?? t("unnamed");
            const showMenu = canManage || m.isSelf;
            return (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <PersonAvatar
                      src={m.avatarUrl}
                      initials={initialsOf(m.fullName)}
                      className="size-7"
                      fallbackClassName="text-xs"
                    />
                    <span className="font-medium">{name}</span>
                    {m.isSelf ? (
                      <Badge variant="secondary" className="text-[11px]">
                        {t("you")}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {tr(m.role)}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {m.listingCount}
                </TableCell>
                <TableCell className="text-right">
                  {showMenu ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("actions")}
                          disabled={pending}
                        >
                          <Icon icon={MoreHorizontalIcon} size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {canManage ? (
                          <>
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                              {t("change_role")}
                            </DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                              value={m.role}
                              onValueChange={(value) =>
                                startTransition(async () => {
                                  notify(
                                    await updateMemberRole(
                                      m.id,
                                      value as WorkspaceRole,
                                    ),
                                    t("role_updated"),
                                  );
                                })
                              }
                            >
                              {WORKSPACE_ROLES.map((r) => (
                                <DropdownMenuRadioItem key={r} value={r}>
                                  {tr(r)}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                          </>
                        ) : null}
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() =>
                            startTransition(async () => {
                              notify(
                                await removeMember(m.id),
                                m.isSelf ? t("left") : t("removed"),
                              );
                            })
                          }
                        >
                          {m.isSelf ? t("leave") : t("remove")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

type InviteRow = {
  id: string;
  email: string;
  role: "agent" | "assistant";
  expiresAt: string;
};

export function InvitesTable({ invites }: { invites: InviteRow[] }) {
  const t = useTranslations("settings.members");
  const tr = useTranslations("roles");
  const format = useFormatter();
  const notify = useActionToast();
  const [pending, startTransition] = React.useTransition();

  if (invites.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        {t("no_pending")}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("email")}</TableHead>
            <TableHead className="w-32">{t("col_role")}</TableHead>
            <TableHead className="w-40">{t("expires")}</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.map((i) => {
            const expired = new Date(i.expiresAt) < new Date();
            return (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.email}</TableCell>
                <TableCell className="text-muted-foreground">
                  {tr(i.role)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {expired ? (
                    <Badge variant="warning">{t("expired")}</Badge>
                  ) : (
                    format.dateTime(new Date(i.expiresAt), {
                      dateStyle: "medium",
                    })
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        notify(await revokeInvite(i.id), t("revoked"));
                      })
                    }
                  >
                    {t("revoke")}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
