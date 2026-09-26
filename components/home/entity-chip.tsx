import Link from "next/link";

import {
  Building03Icon,
  Calendar03Icon,
  CheckmarkSquare02Icon,
  Icon,
  InboxIcon,
  UserIcon,
  type IconSvgElement,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import type { MentionKind } from "@/lib/ai/mentions";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<MentionKind, IconSvgElement> = {
  property: Building03Icon,
  person: UserIcon,
  conversation: InboxIcon,
  application: UserIcon,
  calendar: Calendar03Icon,
  task: CheckmarkSquare02Icon,
};

export function EntityChip({
  kind,
  title,
  href,
}: {
  kind: MentionKind;
  title: string;
  href: string;
}) {
  return (
    <Badge
      variant="outline"
      asChild
      className={cn(
        "me-px inline-flex h-auto max-w-[12rem] -translate-y-px align-middle border-foreground/10 bg-card px-1.5 py-[3px] text-[length:inherit] font-medium leading-none text-foreground hover:bg-muted [&>svg]:size-[0.875em]!",
      )}
    >
      <Link href={href} title={title}>
        <Icon
          icon={KIND_ICON[kind]}
          size={16}
          className="size-[0.875em] text-muted-foreground"
        />
        <span className="min-w-0 truncate">{title}</span>
      </Link>
    </Badge>
  );
}
