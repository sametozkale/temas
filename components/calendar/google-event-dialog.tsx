"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Icon, Link01Icon, Location01Icon, Video01Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GoogleEventGuest } from "@/lib/integrations/google/event-details";
import { cn } from "@/lib/utils";

export type GoogleEventDialogEvent = {
  title: string;
  when: string;
  day: string;
  location: string | null;
  calendarName: string;
  description: string | null;
  meetUrl: string | null;
  htmlUrl: string | null;
  guests: GoogleEventGuest[];
};

export function GoogleEventDialog({
  event,
  open,
  onOpenChange,
}: {
  event: GoogleEventDialogEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("calendar");
  const format = useFormatter();
  if (!event) return null;
  const day = format.dateTime(new Date(`${event.day}T12:00:00`), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const when = event.when || t("google_all_day");
  const meetIsGoogle = event.meetUrl?.includes("meet.google.com") ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="px-4 pt-4 pr-11 pb-3">
          <DialogHeader className="gap-1">
            <DialogTitle className="font-sans text-sm leading-5 font-medium">
              {event.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {day}
              <span aria-hidden> · </span>
              {when}
            </DialogDescription>
          </DialogHeader>
        </div>

        {event.meetUrl || event.location ? (
          <div className="flex flex-col gap-2.5 px-4 pb-3">
            {event.meetUrl ? (
              <Button variant="outline" size="sm" className="w-fit" asChild>
                <a href={event.meetUrl} target="_blank" rel="noreferrer">
                  <Icon icon={Video01Icon} size={16} />
                  {meetIsGoogle ? t("google_meet") : t("google_video")}
                </a>
              </Button>
            ) : null}
            {event.location ? (
              <DetailRow icon={Location01Icon}>
                <p className="text-sm">{event.location}</p>
              </DetailRow>
            ) : null}
          </div>
        ) : null}

        {event.guests.length > 0 ? (
          <section className="border-t px-4 py-3">
            <h2 className="mb-2 text-xs text-muted-foreground">{t("google_guests")}</h2>
            <ul className="flex max-h-44 flex-col gap-2.5 overflow-auto">
              {event.guests.map((guest) => {
                const label = guest.self ? t("google_you") : guest.name || guest.email;
                const showEmail = Boolean(guest.name || guest.self);
                return (
                  <li key={guest.email} className="flex items-center gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                      {guestInitials(label)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm",
                          guest.response === "declined" &&
                            "text-muted-foreground line-through",
                        )}
                      >
                        {label}
                      </span>
                      {showEmail ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {guest.email}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted-foreground">
                      <span className="block">{t(`google_guest_${guest.response}`)}</span>
                      {guest.organizer ? (
                        <span className="block">{t("google_organizer")}</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {event.description ? (
          <div className="border-t px-4 py-3">
            <p className="max-h-36 overflow-auto text-sm whitespace-pre-wrap text-muted-foreground">
              <Linkified text={event.description} />
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {event.calendarName}
          </p>
          {event.htmlUrl ? (
            <a
              href={event.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <Icon icon={Link01Icon} size={16} />
              {t("google_open")}
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function guestInitials(label: string) {
  const parts = label.split(/\s+/).filter(Boolean);
  const raw =
    parts.length > 1
      ? `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`
      : label.slice(0, 2);
  return raw.toUpperCase();
}

function DetailRow({
  icon,
  children,
}: {
  icon: typeof Location01Icon;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon icon={icon} size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (!part.startsWith("http")) return <span key={index}>{part}</span>;
    const url = part.replace(/[),.;]+$/, "");
    const tail = part.slice(url.length);
    return (
      <span key={index}>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          {url}
        </a>
        {tail}
      </span>
    );
  });
}
