"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { manageMailbox } from "@/app/(app)/inbox/actions";
import {
  ArchiveIcon,
  Delete02Icon,
  Icon,
  InboxUnreadIcon,
  SpamIcon,
  StarIcon,
  type IconSvgElement,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MailboxAction } from "@/lib/inbox/mailbox";
import { cn } from "@/lib/utils";

const ACTIONS: {
  action: MailboxAction;
  label: "archive" | "spam" | "trash" | "unread" | "star";
  icon: IconSvgElement;
  leave: boolean;
}[] = [
  { action: "star", label: "star", icon: StarIcon, leave: false },
  { action: "unread", label: "unread", icon: InboxUnreadIcon, leave: true },
  { action: "archive", label: "archive", icon: ArchiveIcon, leave: true },
  { action: "spam", label: "spam", icon: SpamIcon, leave: true },
  { action: "trash", label: "trash", icon: Delete02Icon, leave: true },
];

const DONE = {
  archive: "archived",
  spam: "reported_spam",
  trash: "trashed",
  unread: "marked_unread",
  star: "starred",
  unstar: "unstarred",
} as const;

export function ThreadActions({
  conversationId,
  starred,
}: {
  conversationId: string;
  starred: boolean;
}) {
  const t = useTranslations("inbox");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [starOn, setStarOn] = React.useState(starred);

  function run(action: MailboxAction, leave: boolean) {
    const next = action === "star" ? (starOn ? "unstar" : "star") : action;
    startTransition(async () => {
      const res = await manageMailbox(conversationId, next);
      if (!res.ok) {
        toast.error(t(`errors.${res.error}`));
        return;
      }
      toast.success(t(DONE[next]));
      if (next === "star" || next === "unstar") {
        setStarOn(next === "star");
        return;
      }
      if (leave) router.push("/inbox");
    });
  }

  return (
    <div className="flex shrink-0 items-center">
      {ACTIONS.map((item) => {
        const on = item.action === "star" && starOn;
        const label = on ? t("unstar") : t(item.label);
        return (
          <Tooltip key={item.action}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn("text-muted-foreground", on && "text-foreground")}
                aria-label={label}
                aria-pressed={item.action === "star" ? on : undefined}
                disabled={pending}
                onClick={() => run(item.action, item.leave)}
              >
                <Icon
                  icon={item.icon}
                  size={16}
                  className={on ? "[&_path]:fill-current" : undefined}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
