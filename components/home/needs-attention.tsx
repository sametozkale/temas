"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { HomeRow, HomeSection } from "@/components/home/home-list";
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

  if (items.length === 0) return null;

  async function refresh() {
    setPending(true);
    const result = await scanNow();
    setPending(false);
    if (!result.ok) toast.error(t("scan_failed"));
    else router.refresh();
  }

  return (
    <HomeSection
      title={t("title")}
      action={
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={pending}
          onClick={() => void refresh()}
        >
          {t("refresh")}
        </Button>
      }
    >
      {items.map((item) => (
        <HomeRow
          key={item.id}
          href={reminderHref(item.kind, item.entity, item.entityId)}
          title={item.message}
          trailing={
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
          }
        />
      ))}
    </HomeSection>
  );
}
