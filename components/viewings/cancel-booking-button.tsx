"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { cancelBookingByToken } from "@/app/(public)/b/actions";
import { Button } from "@/components/ui/button";

export function CancelBookingButton({ token }: { token: string }) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await cancelBookingByToken(token);
          if (!res.ok) {
            toast.error(t("errors.generic"));
            return;
          }
          toast.success(t("cancelled_toast"));
          router.refresh();
        })
      }
    >
      {t("cancel")}
    </Button>
  );
}
