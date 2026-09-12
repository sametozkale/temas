"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { confirmBookingOtp, requestBookingOtp } from "@/app/(public)/b/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDate, formatDateTime } from "@/lib/format";
import { civilDate } from "@/lib/slots";
import { cn } from "@/lib/utils";

export type PublicSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
};

export function BookingFlow({
  token,
  timezone,
  slots,
}: {
  token: string;
  timezone: string;
  slots: PublicSlot[];
}) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [visitorTz, setVisitorTz] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<PublicSlot | null>(null);
  const [otpId, setOtpId] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      setVisitorTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      setVisitorTz(timezone);
    }
  }, [timezone]);

  const byDay = React.useMemo(() => {
    const map = new Map<string, PublicSlot[]>();
    for (const slot of slots) {
      const key = civilDate(new Date(slot.startsAt), timezone);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [slots, timezone]);

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

  if (otpId && selected) {
    return (
      <form action={submitOtp} className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">
            {t("otp_title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("otp_hint")}</p>
          <p className="mt-3 text-sm font-medium">
            {formatDateTime(selected.startsAt, timezone)}
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
    );
  }

  if (selected) {
    return (
      <form action={submitDetails} className="space-y-6">
        <div>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setSelected(null)}
          >
            {t("back")}
          </button>
          <h2 className="mt-3 font-serif text-2xl tracking-tight">
            {t("details_title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(selected.startsAt, timezone)}
            {visitorTz && visitorTz !== timezone
              ? ` · ${formatDateTime(selected.startsAt, visitorTz)} (${visitorTz})`
              : null}
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
    );
  }

  return (
    <div className="space-y-8">
      {byDay.map(([date, daySlots]) => (
        <section key={date} className="space-y-3">
          <h2 className="text-sm font-medium">
            {formatDate(
              daySlots[0]!.startsAt,
              { weekday: "long", day: "numeric", month: "long" },
              timezone,
            )}
          </h2>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelected(slot)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm tabular-nums transition-colors",
                  "hover:border-foreground hover:bg-accent",
                )}
              >
                {formatDate(slot.startsAt, { timeStyle: "short" }, timezone)}
                {visitorTz && visitorTz !== timezone ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    {formatDate(
                      slot.startsAt,
                      { timeStyle: "short" },
                      visitorTz,
                    )}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
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
