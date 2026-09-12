"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyLinkButton({ url, label }: { url: string; label: string }) {
  const t = useTranslations("pipeline");
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={() => {
        void navigator.clipboard.writeText(url).then(
          () => toast.success(t("copied")),
          () => toast.success(t("copied"), { description: url }),
        );
      }}
    >
      {label}
    </Button>
  );
}
