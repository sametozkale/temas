"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Icon, Link01Icon, Location01Icon, UserGroupIcon, Video01Icon } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GoogleEventGuest } from "@/lib/integrations/google/event-details";

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>
            {day} · {when}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {event.meetUrl ? (
            <DetailRow icon={Video01Icon}>
              <a
                href={event.meetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline-offset-4 hover:underline"
              >
                {meetIsGoogle ? t("google_meet") : t("google_video")}
              </a>
            </DetailRow>
          ) : null}
          {event.location ? (
            <DetailRow icon={Location01Icon}>
              <p className="text-sm">{event.location}</p>
            </DetailRow>
          ) : null}
          {event.guests.length > 0 ? (
            <DetailRow icon={UserGroupIcon}>
              <ul className="flex max-h-40 flex-col gap-1 overflow-auto">
                {event.guests.map((guest) => (
                  <li key={guest.email} className="text-sm">
                    <span>
                      {guest.self
                        ? t("google_you")
                        : guest.name || guest.email}
                    </span>
                    {guest.name || guest.self ? (
                      <span className="text-muted-foreground"> · {guest.email}</span>
                    ) : null}
                    <span className="text-muted-foreground">
                      {" "}
                      · {t(`google_guest_${guest.response}`)}
                      {guest.organizer ? ` · ${t("google_organizer")}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </DetailRow>
          ) : null}
          {event.description ? (
            <p className="max-h-40 overflow-auto text-sm whitespace-pre-wrap text-foreground">
              <Linkified text={event.description} />
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">{event.calendarName}</p>
          {event.htmlUrl ? (
            <a
              href={event.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
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
          className="underline-offset-4 hover:underline"
        >
          {url}
        </a>
        {tail}
      </span>
    );
  });
}
