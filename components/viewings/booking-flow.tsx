"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { confirmBookingOtp, requestBookingOtp } from "@/app/(public)/b/actions";
import {
  ArrowLeft01Icon,
  Calendar01Icon,
  Clock01Icon,
  Globe02Icon,
  Icon,
  Location01Icon,
} from "@/components/icons";
import { PersonAvatar } from "@/components/identity-marks";
import { TimezoneSelect } from "@/components/timezone-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { initialsOf } from "@/lib/auth-utils";
import { formatDate, formatDateTime } from "@/lib/format";
import { civilDate } from "@/lib/slots";

export type PublicSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
};

export function BookingShell({
  title,
  address,
  hostName,
  durationMin,
  timezone,
  selectedAt,
  displayTz,
  children,
}: {
  title: string;
  address: string | null;
  hostName: string | null;
  durationMin: number;
  timezone: string;
  selectedAt?: string | null;
  displayTz?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("booking");
  const zone = displayTz ?? timezone;

  return (
    <div className="w-full overflow-hidden border bg-card max-sm:rounded-none max-sm:border-x-0 sm:rounded-xl lg:flex">
      <aside className="w-full shrink-0 space-y-4 border-b p-4 sm:space-y-5 sm:p-6 lg:w-[272px] lg:border-r lg:border-b-0 lg:p-8">
        <div className="space-y-1.5 sm:space-y-2">
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {t("kicker")}
          </p>
          <h1 className="font-serif text-lg font-medium tracking-tight sm:text-xl">
            {title}
          </h1>
        </div>
        {hostName ? (
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <PersonAvatar
              initials={initialsOf(hostName)}
              className="size-6 shrink-0 text-[10px]"
            />
            <span className="min-w-0">
              {t("hosted_by", { name: hostName })}
            </span>
          </div>
        ) : null}
        <ul className="space-y-2 text-sm text-muted-foreground sm:space-y-2.5">
          <MetaRow icon={Clock01Icon}>
            {t("duration", { minutes: durationMin })}
          </MetaRow>
          {address ? <MetaRow icon={Location01Icon}>{address}</MetaRow> : null}
          {selectedAt ? (
            <MetaRow icon={Calendar01Icon}>
              <span className="block text-foreground">
                {formatDate(
                  selectedAt,
                  { weekday: "long", day: "numeric", month: "long" },
                  zone,
                )}
              </span>
              <span>{formatTime(selectedAt, zone)}</span>
            </MetaRow>
          ) : null}
        </ul>
      </aside>
      {children}
    </div>
  );
}

export function BookingFlow({
  token,
  timezone,
  durationMin,
  title,
  address,
  hostName,
  slots,
}: {
  token: string;
  timezone: string;
  durationMin: number;
  title: string;
  address: string | null;
  hostName: string | null;
  slots: PublicSlot[];
}) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [displayTz, setDisplayTz] = React.useState(timezone);
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<PublicSlot | null>(null);
  const [otpId, setOtpId] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setDisplayTz(tz);
    } catch {
      setDisplayTz(timezone);
    }
  }, [timezone]);

  const byDay = React.useMemo(() => {
    const map = new Map<string, PublicSlot[]>();
    for (const slot of slots) {
      const key = civilDate(new Date(slot.startsAt), displayTz);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [slots, displayTz]);

  const availableDays = React.useMemo(() => [...byDay.keys()].sort(), [byDay]);

  const activeDay =
    selectedDay && byDay.has(selectedDay)
      ? selectedDay
      : (availableDays[0] ?? null);
  const daySlots = activeDay ? (byDay.get(activeDay) ?? []) : [];
  const availableDates = React.useMemo(
    () => availableDays.map(civilToLocalDate),
    [availableDays],
  );
  const selectedDate = activeDay ? civilToLocalDate(activeDay) : undefined;
  const todayDate = React.useMemo(
    () => civilToLocalDate(civilDate(new Date(), displayTz)),
    [displayTz],
  );
  const monthBounds = availableDates[0]
    ? {
        startMonth: startOfMonth(availableDates[0]!),
        endMonth: startOfMonth(availableDates[availableDates.length - 1]!),
      }
    : {};

  function submitDetails(formData: FormData) {
    if (!selected) return;
    const input = {
      slotId: selected.id,
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    };
    setError(null);
    startTransition(async () => {
      const res = await requestBookingOtp(token, input);
      if (!res.ok) {
        setError(res.error);
        toast.error(t(`errors.${errorKey(res.error)}`));
        return;
      }
      setOtpId(res.data?.otpId ?? null);
      toast.success(t("otp_sent"));
    });
  }

  function submitOtp(formData: FormData) {
    if (!otpId) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmBookingOtp({
        otpId,
        code: String(formData.get("code") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        toast.error(t(`errors.${errorKey(res.error)}`));
        return;
      }
      router.push(`/b/c/${res.data?.cancelToken}`);
    });
  }

  function goBack() {
    if (otpId) {
      setOtpId(null);
      setError(null);
      return;
    }
    setSelected(null);
    setError(null);
  }

  const picking = !selected;

  return (
    <BookingShell
      title={title}
      address={address}
      hostName={hostName}
      durationMin={durationMin}
      timezone={timezone}
      displayTz={displayTz}
      selectedAt={selected?.startsAt ?? null}
    >
      {picking ? (
        <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
            <h2 className="text-sm font-medium">{t("select_date")}</h2>
            <div className="mx-auto w-fit max-w-full">
              <Calendar
                mode="single"
                required
                selected={selectedDate}
                today={todayDate}
                onSelect={(date) => {
                  if (!date) return;
                  const key = localToCivil(date);
                  if (byDay.has(key)) setSelectedDay(key);
                }}
                disabled={(date) => !byDay.has(localToCivil(date))}
                modifiers={{ available: availableDates }}
                modifiersClassNames={{
                  available: "font-medium text-foreground",
                }}
                showOutsideDays={false}
                defaultMonth={selectedDate}
                startMonth={monthBounds.startMonth}
                endMonth={monthBounds.endMonth}
                className="bg-transparent p-0 [--cell-size:--spacing(8)] sm:[--cell-size:--spacing(9)] lg:[--cell-size:--spacing(10)]"
              />
              <div className="mt-4 space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon icon={Globe02Icon} size={16} />
                  {t("timezone")}
                </p>
                <TimezoneSelect
                  id="booking-timezone"
                  value={displayTz}
                  onValueChange={setDisplayTz}
                  className="h-8 min-w-0 border-0 bg-transparent px-0 shadow-none"
                />
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 border-t p-4 sm:p-6 lg:max-h-[min(36rem,calc(100svh-12rem))] lg:w-[220px] lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:p-8">
            {activeDay && daySlots[0] ? (
              <p className="text-sm font-medium">
                {formatDate(
                  daySlots[0].startsAt,
                  { weekday: "long", day: "numeric", month: "long" },
                  displayTz,
                )}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {daySlots.map((slot) => (
                <Button
                  key={slot.id}
                  type="button"
                  variant="outline"
                  data-booking-time
                  className="h-9 w-full min-w-0 rounded-md! tabular-nums hover:border-brand hover:bg-brand-soft hover:text-brand-foreground"
                  onClick={() => setSelected(slot)}
                >
                  {formatTime(slot.startsAt, displayTz)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 gap-1.5 text-muted-foreground"
            onClick={goBack}
          >
            <Icon icon={ArrowLeft01Icon} size={16} />
            {t("back")}
          </Button>
          {otpId ? (
            <form action={submitOtp} className="space-y-6">
              <div>
                <h2 className="font-serif text-xl tracking-tight sm:text-2xl">
                  {t("otp_title")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("otp_hint")}
                </p>
                <p className="mt-3 text-sm font-medium">
                  {formatDateTime(selected.startsAt, displayTz)}
                </p>
              </div>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="otp-code">{t("code")}</FieldLabel>
                <Input
                  id="otp-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  className="font-mono tracking-[0.3em]"
                />
                {error ? (
                  <FieldError>{t(`errors.${errorKey(error)}`)}</FieldError>
                ) : null}
              </Field>
              <Button type="submit" disabled={pending} className="w-full">
                {t("confirm")}
              </Button>
            </form>
          ) : (
            <form action={submitDetails} className="space-y-6">
              <div>
                <h2 className="font-serif text-xl tracking-tight sm:text-2xl">
                  {t("details_title")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime(selected.startsAt, displayTz)}
                </p>
              </div>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="fullName">{t("full_name")}</FieldLabel>
                  <Input id="fullName" name="fullName" required autoFocus />
                </Field>
                <Field>
                  <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
                  <Input id="email" name="email" type="email" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="phone">{t("phone")}</FieldLabel>
                  <Input id="phone" name="phone" type="tel" />
                </Field>
              </FieldGroup>
              <Button type="submit" disabled={pending} className="w-full">
                {t("send_code")}
              </Button>
            </form>
          )}
        </div>
      )}
    </BookingShell>
  );
}

function MetaRow({
  icon,
  children,
}: {
  icon: React.ComponentProps<typeof Icon>["icon"];
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      <Icon
        icon={icon}
        size={16}
        className="mt-0.5 shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 leading-5">{children}</span>
    </li>
  );
}

function formatTime(value: string, timeZone: string) {
  return formatDate(
    value,
    { hour: "2-digit", minute: "2-digit", hour12: false },
    timeZone,
  );
}

function civilToLocalDate(civil: string) {
  const [y, m, d] = civil.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

function localToCivil(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function errorKey(error: string) {
  const known = [
    "invalid",
    "rate_limited",
    "not_found",
    "slot_taken",
    "otp_expired",
    "otp_invalid",
  ];
  return known.includes(error) ? error : "generic";
}
