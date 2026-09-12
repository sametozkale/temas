"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { rotateOwnerLink } from "@/app/(app)/properties/[id]/applications/actions";
import { CopyLinkButton } from "@/components/pipeline/copy-link-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        <p className="truncate text-xs text-muted-foreground">{url}</p>
        <div className="flex flex-wrap gap-2">
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
      </CardContent>
    </Card>
  );
}
