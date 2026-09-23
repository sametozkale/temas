"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import {
  AiMagicIcon,
  Building03Icon,
  Money01Icon,
  UserGroupIcon,
} from "@/components/icons";
import {
  SettingsGroup,
  SettingsItem,
  SettingsStatus,
} from "@/components/settings/settings-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { PLANS, PLAN_IDS, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

import { selectWorkspacePlan } from "../actions";

export function BillingPanel({
  plan,
  seatsUsed,
  listingsUsed,
  creditsRemaining,
  creditsLimit,
  resetsLabel,
}: {
  plan: PlanId;
  seatsUsed: number;
  listingsUsed: number;
  creditsRemaining: number;
  creditsLimit: number;
  resetsLabel: string;
}) {
  const t = useTranslations("settings.billing");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const current = PLANS[plan];

  function switchTo(next: PlanId) {
    startTransition(async () => {
      const result = await selectWorkspacePlan(next);
      if (result.ok) {
        toast.success(t("switched"));
        router.refresh();
        return;
      }
      toast.error(tCommon("error_generic"));
    });
  }

  return (
    <>
      <SettingsGroup title={t("plan")} footer={t("plan_hint")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {PLAN_IDS.map((id) => {
            const catalog = PLANS[id];
            const selected = id === plan;
            return (
              <div
                key={id}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex flex-col gap-4 rounded-2xl border bg-card p-4",
                  selected && "border-foreground/25",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{t(`plan_${id}`)}</p>
                    <p className="mt-1 font-serif text-2xl font-medium tracking-tight">
                      {t(`price_${id}`)}
                    </p>
                  </div>
                  {selected ? (
                    <Badge variant="brand">{t("current")}</Badge>
                  ) : null}
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>{t("feature_seats", { count: catalog.seats })}</li>
                  <li>
                    {t("feature_listings", { count: catalog.properties })}
                  </li>
                  <li>
                    {t("feature_credits", {
                      count:
                        formatNumber(catalog.aiMessagesPerMonth) ??
                        catalog.aiMessagesPerMonth,
                    })}
                  </li>
                </ul>
                {selected ? null : (
                  <Button
                    type="button"
                    size="sm"
                    className="mt-auto self-start"
                    disabled={pending}
                    onClick={() => switchTo(id)}
                  >
                    {t("switch_to", { plan: t(`plan_${id}`) })}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("cycle")}>
        <SettingsItem
          icon={UserGroupIcon}
          title={t("seats")}
          description={t("seats_description")}
        >
          <SettingsStatus>
            {t("usage_value", {
              used: formatNumber(seatsUsed) ?? seatsUsed,
              limit: formatNumber(current.seats) ?? current.seats,
            })}
          </SettingsStatus>
        </SettingsItem>
        <SettingsItem
          icon={Building03Icon}
          title={t("listings")}
          description={t("listings_description")}
        >
          <SettingsStatus>
            {t("usage_value", {
              used: formatNumber(listingsUsed) ?? listingsUsed,
              limit: formatNumber(current.properties) ?? current.properties,
            })}
          </SettingsStatus>
        </SettingsItem>
        <SettingsItem
          icon={AiMagicIcon}
          title={t("credits")}
          description={t("credits_description", { date: resetsLabel })}
        >
          <SettingsStatus>
            {t("credits_value", {
              remaining: formatNumber(creditsRemaining) ?? creditsRemaining,
              limit: formatNumber(creditsLimit) ?? creditsLimit,
            })}
          </SettingsStatus>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t("payment")}>
        <SettingsItem
          icon={Money01Icon}
          title={t("payment_card")}
          description={t("payment_description")}
        >
          <SettingsStatus>{t("payment_none")}</SettingsStatus>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t("invoices")}>
        <div className="overflow-hidden rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col_date")}</TableHead>
                <TableHead>{t("col_description")}</TableHead>
                <TableHead>{t("col_amount")}</TableHead>
                <TableHead>{t("col_status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("invoices_empty")}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </SettingsGroup>
    </>
  );
}
