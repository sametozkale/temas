"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { AiMagicIcon, BubbleChatIcon, Globe02Icon } from "@/components/icons";
import { AiLanguageSelect } from "@/components/ai-language-select";
import {
  SettingsGroup,
  SettingsItem,
} from "@/components/settings/settings-chrome";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TONES } from "@/lib/ai/types";
import { formatNumber } from "@/lib/format";
import type { PlanId } from "@/lib/plans";
import { useSettingsAutoSave } from "@/lib/settings-auto-save";
import { cn } from "@/lib/utils";

import { updateAiPreferences } from "../actions";

export function AiPreferencesForm({
  language,
  tone,
  used,
  limit,
  remaining,
  exhausted,
  plan,
  resetsLabel,
  configured,
}: {
  language: string;
  tone: string;
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
  plan: PlanId;
  resetsLabel: string;
  configured: boolean;
}) {
  const t = useTranslations("settings.ai");
  const tCommon = useTranslations("common");
  const [languageValue, setLanguageValue] = React.useState(language);
  const [toneValue, setToneValue] = React.useState(tone);
  const submit = React.useCallback(
    async (formData: FormData) => {
      const result = await updateAiPreferences(undefined, formData);
      if (result.ok) {
        toast.success(t("saved"));
        return;
      }
      if (result.error !== "invalid") toast.error(tCommon("error_generic"));
    },
    [t, tCommon],
  );
  const { saveNow } = useSettingsAutoSave(submit, { language, tone });

  return (
    <>
      <SettingsGroup
        title={t("usage")}
        footer={!configured ? t("not_configured") : undefined}
      >
        <SettingsItem
          icon={AiMagicIcon}
          title={t("credits")}
          description={
            exhausted
              ? t("credits_exhausted", { date: resetsLabel })
              : t("credits_description", {
                  plan: t(`plan_${plan}`),
                  date: resetsLabel,
                })
          }
          control="below"
        >
          <CreditsMeter
            used={used}
            limit={limit}
            remaining={remaining}
            exhausted={exhausted}
          />
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t("preferences")}>
        <SettingsItem
          icon={Globe02Icon}
          title={t("language")}
          description={t("language_description")}
        >
          <div className="w-full sm:w-52">
            <AiLanguageSelect
              id="ai-language"
              name="language"
              value={languageValue}
              onValueChange={(next) => {
                setLanguageValue(next);
                saveNow({ language: next, tone: toneValue });
              }}
            />
          </div>
        </SettingsItem>
        <SettingsItem
          icon={BubbleChatIcon}
          title={t("tone")}
          description={t("tone_description")}
        >
          <div className="w-full sm:w-52">
            <Select
              name="tone"
              value={toneValue}
              onValueChange={(next) => {
                setToneValue(next);
                saveNow({ language: languageValue, tone: next });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`tone_${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SettingsItem>
      </SettingsGroup>
    </>
  );
}

function CreditsMeter({
  used,
  limit,
  remaining,
  exhausted,
}: {
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
}) {
  const t = useTranslations("settings.ai");
  const usedLabel = formatNumber(used) ?? String(used);
  const limitLabel = formatNumber(limit) ?? String(limit);
  const remainingLabel = formatNumber(remaining) ?? String(remaining);
  const ratio = limit <= 0 ? 0 : remaining / limit;
  const pct = Math.min(100, Math.max(0, ratio * 100));

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex min-w-0 items-baseline gap-1.5">
          <span className="font-serif text-2xl font-medium tracking-tight tabular-nums">
            {remainingLabel}
          </span>
          <span className="text-sm text-muted-foreground">
            {t("credits_left")}
          </span>
        </p>
        <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {t("credits_used", { used: usedLabel, limit: limitLabel })}
        </p>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={remaining}
        aria-label={t("credits_meter", {
          remaining: remainingLabel,
          limit: limitLabel,
        })}
      >
        <div
          className={cn(
            "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
            exhausted
              ? "bg-destructive/70"
              : ratio <= 0.15
                ? "bg-warning"
                : "bg-brand",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
