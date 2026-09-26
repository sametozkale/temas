"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Icon, Tick02Icon } from "@/components/icons";
import { PlanInterval } from "@/components/plan-interval";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import {
  PLANS,
  PLAN_IDS,
  formatUsd,
  planCredits,
  planListings,
  planQuote,
  type BillingInterval,
} from "@/lib/plans";

import { SIGNUP_HREF } from "./primitives";
import { Reveal } from "./reveal";

export function PlansGrid() {
  const t = useTranslations("marketing.plans");
  const [interval, setInterval] = React.useState<BillingInterval>("year");

  return (
    <>
      <div className="mt-8 flex justify-center">
        <PlanInterval
          value={interval}
          onChange={setInterval}
          label={t("interval_label")}
          month={t("interval_month")}
          year={t("interval_year")}
        />
      </div>
      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
        {PLAN_IDS.map((id, index) => {
          const plan = PLANS[id];
          const quote = planQuote(plan, interval);
          const amount = formatUsd(quote.monthlyCents);
          const listings = planListings(plan, interval);
          const features = [
            t("seats", { count: plan.seats }),
            listings.limit == null
              ? t("listings_unlimited")
              : listings.perSeat
                ? t("listings_per_agent", { count: listings.limit })
                : t("listings", { count: listings.limit }),
            t("ai", {
              count: formatNumber(planCredits(plan, interval)) ?? "",
            }),
            t("channels"),
          ];
          return (
            <Reveal
              key={id}
              delay={index * 90}
              className="flex flex-col rounded-2xl border bg-card p-7"
            >
              <h3 className="font-serif text-2xl font-normal tracking-tight">
                {t(`${id}_name`)}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(`${id}_description`)}
              </p>
              <p className="mt-5 font-serif text-4xl font-normal tracking-tight">
                {quote.perSeat
                  ? t("price_seat", { amount })
                  : t("price_month", { amount })}
              </p>
              <p className="mt-1 min-h-4 text-xs text-muted-foreground">
                {quote.annualCents
                  ? quote.perSeat
                    ? t("billed_yearly_seat", {
                        amount: formatUsd(quote.annualCents),
                      })
                    : t("billed_yearly", { amount: formatUsd(quote.annualCents) })
                  : null}
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 text-[15px]"
                  >
                    <Icon icon={Tick02Icon} size={16} className="text-brand" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button size="lg" className="mt-8 w-full" asChild>
                <Link href={SIGNUP_HREF}>{t("cta")}</Link>
              </Button>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}
