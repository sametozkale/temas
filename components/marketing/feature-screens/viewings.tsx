import { getTranslations } from "next-intl/server";

import { WhatsAppMark } from "@/components/brands";
import {
  Calendar03Icon,
  Clock01Icon,
  Icon,
  Link01Icon,
  Location01Icon,
  Notification01Icon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

import { ViewingOverlap } from "../slot-mock";
import { Bar, Bubble, Card, Initials, Phone, Toggle, Window, buildSteps } from "./frame";

const WEEKDAYS = ["d1", "d2", "d3", "d4", "d5", "d6", "d7"] as const;

async function TenantInvite() {
  const t = await getTranslations("marketing.features.viewings.screen");
  return (
    <Phone>
      <div className="flex items-center gap-2 border-b border-foreground/6 bg-card px-3 py-2.5">
        <WhatsAppMark className="size-4" />
        <span className="text-sm font-medium">{t("tenant_name")}</span>
        <span className="ml-auto text-[11px] text-muted-foreground">{t("tenant_role")}</span>
      </div>
      <div className="space-y-2.5 px-3 py-4">
        <Bubble side="out">{t("invite_message")}</Bubble>
        <div className="ml-auto w-[85%] overflow-hidden rounded-2xl border border-foreground/8 bg-card">
          <div className="flex items-center gap-2 bg-brand-soft px-3 py-3 text-brand-foreground">
            <Icon icon={Calendar03Icon} size={18} />
            <span className="text-sm font-medium">{t("invite_card_title")}</span>
          </div>
          <div className="space-y-1.5 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">{t("invite_card_body")}</p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Icon icon={Link01Icon} size={16} className="size-3" />
              {t("invite_card_link")}
            </p>
          </div>
        </div>
        <p className="pt-1 text-right text-[11px] text-muted-foreground">{t("invite_time")}</p>
      </div>
    </Phone>
  );
}

async function TenantWizard() {
  const t = await getTranslations("marketing.features.viewings.screen");
  const days = ["d1", "d2", "d3", "d4", "d5"] as const;
  const picked = new Set(["d2", "d4"]);
  return (
    <Phone>
      <div className="space-y-4 px-4 py-5">
        <div>
          <p className="text-[11px] text-muted-foreground">{t("wizard_step")}</p>
          <p className="mt-1 font-serif text-lg leading-snug">{t("wizard_title")}</p>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("h-1 flex-1 rounded-full", i < 2 ? "bg-foreground" : "bg-foreground/10")} />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {days.map((day) => (
            <span
              key={day}
              className={cn(
                "flex h-9 items-center justify-center rounded-lg text-xs",
                picked.has(day)
                  ? "bg-brand text-primary-foreground"
                  : "border border-foreground/10 bg-card text-muted-foreground",
              )}
            >
              {t(day)}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["wizard_from", "wizard_to"] as const).map((key) => (
            <div key={key} className="rounded-lg border border-foreground/10 bg-card px-3 py-2">
              <p className="text-[10px] text-muted-foreground">{t(`${key}_label`)}</p>
              <p className="flex items-center gap-1.5 text-sm tabular-nums">
                <Icon icon={Clock01Icon} size={16} className="size-3.5 text-muted-foreground" />
                {t(key)}
              </p>
            </div>
          ))}
        </div>
        <span className="flex h-9 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
          {t("wizard_next")}
        </span>
      </div>
    </Phone>
  );
}

async function AgentHours() {
  const t = await getTranslations("marketing.features.viewings.screen");
  return (
    <Window title={t("hours_title")} aside={<span className="text-xs text-muted-foreground">{t("hours_repeat")}</span>}>
      <ul className="divide-y divide-foreground/6 px-4">
        {WEEKDAYS.map((day, index) => {
          const on = index < 5;
          return (
            <li key={day} className="flex h-10 items-center gap-3 text-sm">
              <Toggle on={on} />
              <span className={cn("w-10", on ? "" : "text-muted-foreground")}>{t(day)}</span>
              {on ? (
                <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums">
                  {t("hours_range")}
                </span>
              ) : (
                <span className="ml-auto text-xs text-muted-foreground">{t("hours_off")}</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="grid grid-cols-2 gap-2 border-t border-foreground/6 p-4">
        {(["hours_length", "hours_buffer"] as const).map((key) => (
          <div key={key} className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{t(`${key}_label`)}</p>
            <p className="text-sm tabular-nums">{t(key)}</p>
          </div>
        ))}
      </div>
    </Window>
  );
}

async function BookingPage() {
  const t = await getTranslations("marketing.features.viewings.screen");
  const offset = 3;
  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: 31 }, (_, i) => i + 1),
  ];
  const times = ["time_1", "time_2", "time_3"] as const;
  return (
    <Card className="grid grid-cols-1 overflow-hidden sm:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-3 border-b border-foreground/6 p-4 sm:border-r sm:border-b-0">
        <p className="text-[11px] text-muted-foreground">{t("booking_agency")}</p>
        <p className="font-serif text-lg leading-snug">{t("booking_title")}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon icon={Clock01Icon} size={16} className="size-3.5" />
          {t("booking_length")}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon icon={Location01Icon} size={16} className="size-3.5" />
          {t("booking_place")}
        </p>
        <div className="space-y-1.5 pt-2">
          <Bar className="w-full" />
          <Bar className="w-2/3" />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3 p-4">
        <div>
          <p className="mb-2 text-xs font-medium">{t("booking_month")}</p>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
            {WEEKDAYS.map((day) => (
              <span key={day} className="pb-1">{t(`${day}_short`)}</span>
            ))}
            {cells.map((date, index) => {
              const weekday = index % 7;
              const open = date !== null && (weekday === 1 || weekday === 3);
              const selected = date === 6;
              return (
                <span
                  key={index}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-md tabular-nums",
                    selected
                      ? "bg-foreground text-background"
                      : open
                        ? "bg-brand-soft font-medium text-brand-foreground"
                        : "",
                  )}
                >
                  {date}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex w-20 flex-col gap-1.5">
          <p className="mb-0.5 text-xs font-medium">{t("booking_day")}</p>
          {times.map((key, index) => (
            <span
              key={key}
              className={cn(
                "flex h-8 items-center justify-center rounded-md border text-xs tabular-nums",
                index === 1 ? "border-foreground bg-foreground text-background" : "border-foreground/10",
              )}
            >
              {t(key)}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

async function ApplicantConfirm() {
  const t = await getTranslations("marketing.features.viewings.screen");
  const digits = t("otp_digits").split("");
  return (
    <Phone>
      <div className="space-y-3.5 px-4 py-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs text-brand-foreground">
          <Icon icon={Calendar03Icon} size={16} className="size-3.5" />
          {t("otp_slot")}
        </span>
        {(["otp_name", "otp_email"] as const).map((key) => (
          <div key={key} className="rounded-lg border border-foreground/10 bg-card px-3 py-2">
            <p className="text-[10px] text-muted-foreground">{t(`${key}_label`)}</p>
            <p className="truncate text-sm">{t(key)}</p>
          </div>
        ))}
        <p className="pt-1 text-xs text-muted-foreground">{t("otp_hint")}</p>
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "flex h-10 items-center justify-center rounded-lg border text-base tabular-nums",
                i === digits.length ? "border-foreground" : "border-foreground/10 bg-card",
              )}
            >
              {digits[i] ?? ""}
            </span>
          ))}
        </div>
        <span className="flex h-9 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
          {t("otp_confirm")}
        </span>
      </div>
    </Phone>
  );
}

async function Booked() {
  const t = await getTranslations("marketing.features.viewings.screen");
  const people = [
    { key: "p1", initials: "OM" },
    { key: "p2", initials: "DP" },
    { key: "p3", initials: "SK" },
    { key: "p4", initials: "HL" },
  ] as const;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-foreground/6 p-4">
        <span className="mt-1 h-10 w-1 shrink-0 rounded-full bg-brand" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg leading-snug">{t("booked_title")}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{t("booked_when")}</p>
        </div>
        <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] text-success-foreground">
          {t("booked_status")}
        </span>
      </div>
      <div className="px-4 pt-3 pb-1">
        <p className="text-[11px] text-muted-foreground">{t("booked_notified")}</p>
        <ul className="divide-y divide-foreground/6">
          {people.map((person) => (
            <li key={person.key} className="flex items-center gap-3 py-2.5">
              <Initials>{person.initials}</Initials>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{t(`${person.key}_name`)}</span>
                <span className="block text-[11px] text-muted-foreground">{t(`${person.key}_role`)}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">{t(`${person.key}_channel`)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2 border-t border-foreground/6 px-4 py-3">
        <Icon icon={Notification01Icon} size={16} className="text-muted-foreground" />
        <span className="flex-1 text-xs text-muted-foreground">{t("booked_reminder")}</span>
        <span className="rounded-full border border-foreground/10 px-2.5 py-1 text-[11px]">{t("booked_reschedule")}</span>
        <span className="rounded-full border border-foreground/10 px-2.5 py-1 text-[11px]">{t("booked_cancel")}</span>
      </div>
    </Card>
  );
}

export function viewingsSteps() {
  return buildSteps("viewings", [
    <TenantInvite key="1" />,
    <TenantWizard key="2" />,
    <AgentHours key="3" />,
    <ViewingOverlap key="4" bare />,
    <BookingPage key="5" />,
    <ApplicantConfirm key="6" />,
    <Booked key="7" />,
  ]);
}
