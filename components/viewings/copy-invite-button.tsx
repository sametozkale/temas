"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyInviteButton({ token }: { token: string }) {
  const t = useTranslations("viewings");
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={() => {
        const url = `${window.location.origin}/p/${token}`;
        void navigator.clipboard.writeText(url).then(
          () => toast.success(t("copied")),
          () => toast.success(t("copied"), { description: url }),
        );
      }}
    >
      {t("copy_invite")}
    </Button>
  );
}
