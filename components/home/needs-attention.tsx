"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { EventChip } from "@/components/event-chip";
import { Button } from "@/components/ui/button";
import { reminderHref } from "@/lib/reminders/href";
import { scanNow, dismissReminderAction } from "@/app/(app)/home/actions";

export type ReminderCard = {
  id: string;
  kind: string | null;
  message: string;
  entity: string | null;
  entityId: string | null;
};

export function NeedsAttention({ items }: { items: ReminderCard[] }) {
  const t = useTranslations("home.attention");
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function refresh() {
    setPending(true);
    const result = await scanNow();
    setPending(false);
    if (!result.ok) toast.error(t("scan_failed"));
    else router.refresh();
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{t("title")}</h2>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={pending}
          onClick={() => void refresh()}
        >
          {t("refresh")}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="divide-y rounded-lg border px-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <Link
                href={reminderHref(item.kind, item.entity, item.entityId)}
                className="min-w-0 flex-1"
              >
                <EventChip tone="warning" title={item.message} />
              </Link>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={async () => {
                  const result = await dismissReminderAction(item.id);
                  if (result.ok) router.refresh();
                }}
              >
                {t("dismiss")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
