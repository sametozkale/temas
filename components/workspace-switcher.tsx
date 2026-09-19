"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useActionState } from "react";

import { switchWorkspace } from "@/app/(auth)/actions";
import { createAdditionalWorkspace } from "@/app/(app)/workspaces/actions";
import {
  ArrowDown01Icon,
  Building03Icon,
  Icon,
  PlusSignIcon,
  Tick02Icon,
} from "@/components/icons";
import { WorkspaceMark } from "@/components/identity-marks";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TimezoneSelect } from "@/components/timezone-select";
import { initialsOf } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

export type SwitcherWorkspace = {
  id: string;
  name: string;
  role: string;
  imageUrl?: string | null;
};

type Props = {
  workspace?: {
    id?: string;
    name: string;
    initials: string;
    imageUrl?: string | null;
  };
  workspaces?: SwitcherWorkspace[];
  collapsed?: boolean;
  defaultTimezone?: string;
  onNavigate?: () => void;
};

/**
 * Sidebar first control: switch the active workspace (docs/00 §4, docs/01 §6).
 */
export function WorkspaceSwitcher({
  workspace,
  workspaces = [],
  collapsed,
  defaultTimezone = "Europe/Istanbul",
  onNavigate,
}: Props) {
  const t = useTranslations("nav");
  const tr = useTranslations("roles");
  const [pending, startTransition] = React.useTransition();
  const [createOpen, setCreateOpen] = React.useState(false);

  const label = workspace?.name ?? t("workspace_placeholder");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("switch_workspace")}
            className={cn(
              "flex h-7 min-w-0 items-center gap-2 rounded-md pl-1 text-left transition-colors hover:bg-sidebar-accent/60 aria-expanded:bg-sidebar-accent",
              !collapsed && "flex-1",
            )}
          >
            <WorkspaceMark
              src={workspace?.imageUrl}
              initials={workspace?.initials ?? "H"}
              className="size-6 text-[11px]"
            />
            {!collapsed ? (
              <span className="flex min-w-0 flex-1 items-center">
                <span className="min-w-0 truncate text-sm font-medium">
                  {label}
                </span>
                <Icon
                  icon={ArrowDown01Icon}
                  size={16}
                  className="ml-auto mr-1 shrink-0 text-muted-foreground/50"
                />
              </span>
            ) : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={collapsed ? "right" : "bottom"}
          align="start"
          className="w-56"
        >
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              disabled={pending || ws.id === workspace?.id}
              onSelect={() => startTransition(() => switchWorkspace(ws.id))}
            >
              <WorkspaceMark
                src={ws.imageUrl}
                initials={initialsOf(ws.name, "H")}
                className="size-5 text-[10px]"
              />
              <span className="min-w-0 flex-1 truncate">{ws.name}</span>
              <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                {tr(ws.role as "owner" | "agent" | "assistant")}
              </span>
              {ws.id === workspace?.id ? (
                <Icon icon={Tick02Icon} size={16} className="ml-1 shrink-0" />
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setCreateOpen(true);
            }}
          >
            <Icon icon={PlusSignIcon} size={16} />
            {t("new_workspace")}
          </DropdownMenuItem>
          {workspaces.length > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem asChild>
            <Link href="/settings/workspace" onClick={onNavigate}>
              <Icon icon={Building03Icon} size={16} />
              {t("workspace_settings")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultTimezone={defaultTimezone}
      />
    </>
  );
}

function CreateWorkspaceDialog({
  open,
  onOpenChange,
  defaultTimezone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTimezone: string;
}) {
  const t = useTranslations("nav");
  const to = useTranslations("onboarding");
  const [state, action, pending] = useActionState(
    createAdditionalWorkspace,
    undefined,
  );
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="space-y-6">
          <DialogHeader>
            <DialogTitle>{t("new_workspace")}</DialogTitle>
            <DialogDescription>{t("new_workspace_hint")}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={fieldErrors?.workspaceName ? true : undefined}>
              <FieldLabel htmlFor="ws-name">{to("workspace_name")}</FieldLabel>
              <Input
                id="ws-name"
                name="workspaceName"
                required
                autoFocus
                placeholder={to("workspace_placeholder")}
              />
              {fieldErrors?.workspaceName ? (
                <FieldError>{to("errors.workspace_name")}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="ws-tz">{to("timezone")}</FieldLabel>
              <TimezoneSelect
                id="ws-tz"
                name="timezone"
                defaultValue={defaultTimezone}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" size="lg" disabled={pending}>
              {t("create_workspace")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
