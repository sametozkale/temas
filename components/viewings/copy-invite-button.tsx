"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Copy01Icon, Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function CopyInviteButton({ token }: { token: string }) {
  const t = useTranslations("viewings");
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0 bg-card"
      onClick={() => {
        const url = `${window.location.origin}/p/${token}`;
        void navigator.clipboard.writeText(url).then(
          () => toast.success(t("copied")),
          () => toast.success(t("copied"), { description: url }),
        );
      }}
    >
      <Icon icon={Copy01Icon} size={16} data-icon="inline-start" />
      {t("copy_invite")}
    </Button>
  );
}
