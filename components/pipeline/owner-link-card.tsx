"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { rotateOwnerLink } from "@/app/(app)/properties/[id]/applications/actions";
import { CopyLinkButton } from "@/components/pipeline/copy-link-button";
import { Button } from "@/components/ui/button";

export function OwnerLinkCard({
  propertyId,
  url,
  canManage,
}: {
  propertyId: string;
  url: string;
  canManage: boolean;
}) {
  const t = useTranslations("pipeline.owner");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="truncate text-xs text-muted-foreground" title={url}>
          {url}
        </p>
      </div>
      <CopyLinkButton url={url} label={t("copy_link")} />
      {canManage ? (
        <Button
          type="button"
          variant="soft"
          size="xs"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await rotateOwnerLink(propertyId);
              if (!res.ok) toast.error(t("errors.generic"));
              else toast.success(t("rotated"));
              router.refresh();
            });
          }}
        >
          {t("rotate")}
        </Button>
      ) : null}
    </div>
  );
}
