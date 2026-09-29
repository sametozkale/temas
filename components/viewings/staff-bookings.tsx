"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import {
  bookViewing,
  cancelViewing,
  rescheduleViewing,
} from "@/app/(app)/properties/[id]/viewings/actions";
import { EventChip } from "@/components/event-chip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type StaffSlot = { id: string; label: string; time: string };
export type StaffBooking = {
  id: string;
  label: string;
  time: string;
  prospectName: string;
};

/** Open slots with Book, and booked viewings with Reschedule / Cancel (docs/04 §4.1). */
export function StaffBookings({
  propertyId,
  slots,
  bookings,
  canManage,
}: {
  propertyId: string;
  slots: StaffSlot[];
  bookings: StaffBooking[];
  canManage: boolean;
}) {
  const t = useTranslations("viewings");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [booking, setBooking] = React.useState<StaffSlot | null>(null);
  const [moving, setMoving] = React.useState<StaffBooking | null>(null);
  const [target, setTarget] = React.useState<string>("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(done);
        setBooking(null);
        setMoving(null);
        router.refresh();
      } else {
        toast.error(
          res.error === "slot_taken" ? t("errors.slot_taken") : t("errors.generic"),
        );
      }
    });
  }

  function submitBooking(formData: FormData) {
    if (!booking) return;
    run(
      () =>
        bookViewing({
          propertyId,
          slotId: booking.id,
          fullName: String(formData.get("fullName") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
        }),
      t("booked_toast"),
    );
  }

  return (
    <>
      <section className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">{t("booked_title")}</h2>
          <p className="text-xs text-muted-foreground">{t("booked_hint")}</p>
        </div>
        {bookings.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("no_bookings")}
          </p>
        ) : (
          <div className="divide-y px-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-1">
                <EventChip
                  className="min-w-0 flex-1"
                  tone="success"
                  time={b.time}
                  title={b.prospectName}
                  meta={b.label}
                />
                {canManage ? (
                  <>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={pending || slots.length === 0}
                      onClick={() => {
                        setTarget("");
                        setMoving(b);
                      }}
                    >
                      {t("reschedule")}
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => cancelViewing({ bookingId: b.id }),
                          t("cancelled_toast"),
                        )
                      }
                    >
                      {t("cancel_booking")}
                    </Button>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">{t("upcoming")}</h2>
          <p className="text-xs text-muted-foreground">{t("upcoming_hint")}</p>
        </div>
        {slots.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("no_slots")}
          </p>
        ) : (
          <div className="divide-y px-2">
            {slots.slice(0, 12).map((s) => (
              <div key={s.id} className="flex items-center gap-1">
                <EventChip
                  className="min-w-0 flex-1"
                  tone="brand"
                  time={s.time}
                  title={s.label}
                />
                {canManage ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setBooking(s)}
                  >
                    {t("book")}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={booking !== null} onOpenChange={(o) => !o && setBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <form action={submitBooking} className="space-y-6">
            <DialogHeader>
              <DialogTitle>{t("book_title")}</DialogTitle>
              <DialogDescription>
                {t("book_description", { when: booking?.label ?? "" })}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="book-name">{t("book_name")}</FieldLabel>
                <Input id="book-name" name="fullName" required minLength={2} autoFocus />
              </Field>
              <Field>
                <FieldLabel htmlFor="book-email">{t("book_email")}</FieldLabel>
                <Input id="book-email" name="email" type="email" />
              </Field>
              <Field>
                <FieldLabel htmlFor="book-phone">{t("book_phone")}</FieldLabel>
                <Input id="book-phone" name="phone" type="tel" />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {t("book_confirm")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={moving !== null} onOpenChange={(o) => !o && setMoving(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("reschedule_title")}</DialogTitle>
            <DialogDescription>
              {t("reschedule_description", {
                name: moving?.prospectName ?? "",
                when: moving?.label ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-full" aria-label={t("reschedule_to")}>
              <SelectValue placeholder={t("reschedule_to")} />
            </SelectTrigger>
            <SelectContent>
              {slots.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              disabled={pending || !target || !moving}
              onClick={() =>
                moving &&
                run(
                  () => rescheduleViewing({ bookingId: moving.id, slotId: target }),
                  t("rescheduled_toast"),
                )
              }
            >
              {t("reschedule_confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
