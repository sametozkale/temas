"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { submitOwnerDecision } from "@/app/(public)/o/actions";
import { EmptyState } from "@/components/empty-state";
import { PersonAvatar } from "@/components/identity-marks";
import { UserGroupIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { initialsOf } from "@/lib/auth-utils";

export type OwnerCard = {
  id: string;
  fullName: string;
  memberLine: string | null;
  email: string | null;
  stageName: string | null;
  score: number | null;
  summary: string | null;
  facts: { label: string; value: string }[];
};

export function OwnerBoard({
  token,
  cards,
}: {
  token: string;
  cards: OwnerCard[];
}) {
  const t = useTranslations("owner_view");
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  function decide(
    applicationId: string,
    decision: "approve" | "request_changes",
  ) {
    setPendingId(applicationId);
    void submitOwnerDecision(token, { applicationId, decision }).then((res) => {
      setPendingId(null);
      if (!res.ok) {
        toast.error(
          t(
            `errors.${res.error === "rate_limited" ? "rate_limited" : "generic"}`,
          ),
        );
        return;
      }
      toast.success(
        decision === "approve" ? t("approved") : t("changes_requested"),
      );
      router.refresh();
    });
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={UserGroupIcon}
        title={t("empty")}
        description={t("empty_hint")}
        className="w-full bg-card"
      />
    );
  }

  return (
    <div className="grid w-full items-stretch gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <Card key={card.id} className="flex flex-col">
          <CardHeader className="flex-row items-start gap-3">
            <PersonAvatar
              initials={initialsOf(card.fullName)}
              className="size-9 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{card.fullName}</p>
              {card.memberLine || card.email ? (
                <p className="truncate text-xs text-muted-foreground">
                  {card.memberLine ?? card.email}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {card.stageName ? (
                <Badge variant="secondary">{card.stageName}</Badge>
              ) : null}
              {card.score != null ? (
                <Badge variant="info">
                  {t("score")} {card.score}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {card.summary ? (
              <p className="text-sm text-muted-foreground">{card.summary}</p>
            ) : null}
            {card.facts.length > 0 ? (
              <dl className="space-y-2 text-sm">
                {card.facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <dt className="text-muted-foreground">{fact.label}</dt>
                    <dd className="min-w-0 text-right">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                disabled={pendingId === card.id}
                onClick={() => decide(card.id, "approve")}
              >
                {t("approve")}
              </Button>
              <Button
                size="sm"
                variant="soft"
                disabled={pendingId === card.id}
                onClick={() => decide(card.id, "request_changes")}
              >
                {t("request_changes")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
