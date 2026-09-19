"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { FilterIcon, Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ALL = "all";

export function InboxAgentFilter({
  agents,
}: {
  agents: { userId: string; name: string }[];
  currentUserId?: string;
}) {
  const t = useTranslations("inbox");
  const router = useRouter();
  const params = useSearchParams();
  const channel = params.get("channel") ?? ALL;
  const unanswered = params.get("unanswered") === "1";
  const agent = params.get("agent") ?? ALL;
  const active = channel !== ALL || unanswered || agent !== ALL;

  function apply(patch: Record<string, string | null>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, next] of Object.entries(patch)) {
      if (!next || next === ALL) search.delete(key);
      else search.set(key, next);
    }
    const qs = search.toString();
    router.replace(qs ? `/inbox?${qs}` : "/inbox");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("filter")}
          className={cn(
            "text-muted-foreground",
            active && "text-foreground",
          )}
        >
          <Icon icon={FilterIcon} size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{t("filter_channel")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={channel}
          onValueChange={(next) => apply({ channel: next })}
        >
          <DropdownMenuRadioItem value={ALL}>
            {t("filter_channel_all")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="gmail">
            {t("filter_gmail")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="whatsapp">
            {t("filter_whatsapp")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={unanswered}
          onCheckedChange={(next) =>
            apply({ unanswered: next ? "1" : null })
          }
        >
          {t("filter_unanswered")}
        </DropdownMenuCheckboxItem>
        {agents.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("filter_agent")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={agent}
              onValueChange={(next) => apply({ agent: next })}
            >
              <DropdownMenuRadioItem value={ALL}>
                {t("filter_agent_all")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="me">
                {t("filter_agent_mine")}
              </DropdownMenuRadioItem>
              {agents.map((member) => (
                <DropdownMenuRadioItem
                  key={member.userId}
                  value={member.userId}
                >
                  {member.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
