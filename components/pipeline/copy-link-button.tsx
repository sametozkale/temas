"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Copy01Icon, Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ url, label }: { url: string; label: string }) {
  const t = useTranslations("pipeline");
  return (
    <Button
      type="button"
      variant="soft"
      size="xs"
      onClick={() => {
        void navigator.clipboard.writeText(url).then(
          () => toast.success(t("copied")),
          () => toast.success(t("copied"), { description: url }),
        );
      }}
    >
      <Icon icon={Copy01Icon} size={16} data-icon="inline-start" />
      {label}
    </Button>
  );
}
