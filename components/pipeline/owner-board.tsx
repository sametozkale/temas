"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { submitOwnerDecision } from "@/app/(public)/o/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type OwnerCard = {
  id: string;
  fullName: string;
  email: string | null;
  stageName: string | null;
  score: number | null;
  summary: string | null;
  answers: Record<string, unknown>;
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
      <p className="py-12 text-center text-sm text-muted-foreground">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <Card key={card.id}>
          <CardHeader className="flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>{card.fullName}</CardTitle>
              {card.email ? (
                <p className="text-xs text-muted-foreground">{card.email}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1">
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
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {card.summary ?? t("no_summary")}
            </p>
            <dl className="space-y-1 text-sm">
              {Object.entries(card.answers)
                .slice(0, 6)
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="text-right">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </dd>
                  </div>
                ))}
            </dl>
            <div className="flex flex-wrap gap-2">
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
