"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { setGoogleCalendars } from "@/app/(app)/calendar/actions";
import { Icon, Calendar03Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GoogleCalendarChoice } from "@/lib/calendar/google";

export function GoogleCalendarMenu({
  status,
  calendars,
  canConnect,
}: {
  status: "off" | "reconnect" | "ready";
  calendars: GoogleCalendarChoice[];
  canConnect: boolean;
}) {
  const t = useTranslations("calendar");
  const [pending, startTransition] = useTransition();

  if (status === "off") {
    if (!canConnect) return null;
    return (
      <Button variant="ghost" size="xs" asChild>
        <Link href="/settings/integrations/gmail">{t("google_connect")}</Link>
      </Button>
    );
  }

  if (status === "reconnect") {
    if (!canConnect) return null;
    return (
      <Button variant="ghost" size="xs" asChild>
        <Link href="/api/integrations/gmail/start">{t("google_reconnect")}</Link>
      </Button>
    );
  }

  function toggle(id: string, checked: boolean) {
    const next = calendars
      .filter((calendar) =>
        calendar.id === id ? checked : calendar.selected,
      )
      .map((calendar) => calendar.id);
    startTransition(() => {
      void setGoogleCalendars(next);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={pending}
          className="text-muted-foreground"
        >
          <Icon icon={Calendar03Icon} size={16} />
          {t("google")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t("google_private")}
        </DropdownMenuLabel>
        {calendars.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            {t("google_empty")}
          </p>
        ) : (
          calendars.map((calendar) => (
            <DropdownMenuCheckboxItem
              key={calendar.id}
              checked={calendar.selected}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => toggle(calendar.id, checked === true)}
            >
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-muted-foreground/40"
                style={
                  calendar.color
                    ? { backgroundColor: calendar.color }
                    : undefined
                }
              />
              <span className="truncate">{calendar.name}</span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
