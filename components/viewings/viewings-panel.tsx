"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import {
  ensureViewingCalendar,
  saveAgentWeek,
  updateCalendarSettings,
} from "@/app/(app)/properties/[id]/viewings/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NumberField } from "@/components/ui/number-field";
import { Switch } from "@/components/ui/switch";
import { Icon, Copy01Icon } from "@/components/icons";
import { WeekGrid } from "@/components/viewings/week-grid";
import type { WeekCell } from "@/lib/viewings/week";
import { emptyWeek } from "@/lib/viewings/week";

const SLOT_LENGTHS = [15, 30, 45, 60] as const;

export function ViewingsPanel({
  propertyId,
  calendar,
  week,
  publicUrl,
  canManage,
  form,
}: {
  propertyId: string;
  calendar: {
    id: string;
    slotDurationMin: number;
    bufferMin: number;
    minNoticeHours: number;
    maxDaysAhead: number;
    isPublished: boolean;
    requireFormFirst: boolean;
    formId: string | null;
  } | null;
  week: WeekCell[];
  publicUrl: string | null;
  canManage: boolean;
  form: { id: string; title: string; isPublished: boolean } | null;
}) {
  const t = useTranslations("viewings");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [cells, setCells] = React.useState(week.length ? week : emptyWeek());
  const [settings, setSettings] = React.useState({
    slotDurationMin: calendar?.slotDurationMin ?? 30,
    bufferMin: calendar?.bufferMin ?? 15,
    minNoticeHours: calendar?.minNoticeHours ?? 4,
    maxDaysAhead: calendar?.maxDaysAhead ?? 21,
    isPublished: calendar?.isPublished ?? false,
    requireFormFirst: calendar?.requireFormFirst ?? false,
    formId: calendar?.formId ?? form?.id ?? null,
  });

  React.useEffect(() => {
    setCells(week.length ? week : emptyWeek());
  }, [week]);

  function createCalendar() {
    startTransition(async () => {
      const res = await ensureViewingCalendar(propertyId);
      if (res.ok) toast.success(t("created"));
      else toast.error(t("errors.generic"));
      router.refresh();
    });
  }

  function saveSettings() {
    startTransition(async () => {
      const res = await updateCalendarSettings(propertyId, settings);
      if (res.ok) toast.success(t("saved"));
      else toast.error(t("errors.generic"));
      router.refresh();
    });
  }

  function saveWeek() {
    startTransition(async () => {
      const res = await saveAgentWeek(propertyId, cells);
      if (res.ok) toast.success(t("windows_saved"));
      else toast.error(t("errors.generic"));
      router.refresh();
    });
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success(t("copied"));
    } catch {
      toast.success(t("copied"), { description: publicUrl });
    }
  }

  if (!calendar) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("setup_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("setup_description")}
          </p>
          {canManage ? (
            <Button onClick={createCalendar} disabled={pending}>
              {t("setup")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const slotLengths = (SLOT_LENGTHS as readonly number[]).includes(
    settings.slotDurationMin,
  )
    ? [...SLOT_LENGTHS]
    : [settings.slotDurationMin, ...SLOT_LENGTHS];
  const settingsDirty =
    settings.slotDurationMin !== calendar.slotDurationMin ||
    settings.bufferMin !== calendar.bufferMin ||
    settings.minNoticeHours !== calendar.minNoticeHours ||
    settings.maxDaysAhead !== calendar.maxDaysAhead;
  const weekDirty =
    JSON.stringify(cells) !== JSON.stringify(week.length ? week : emptyWeek());

  return (
    <div className="min-w-0 space-y-4">
      <Card className="hover:border-border">
        <CardHeader>
          <CardTitle>{t("link_title")}</CardTitle>
          <CardDescription className="text-xs">
            {t("published_hint")}
          </CardDescription>
          <CardAction>
            <Switch
              checked={settings.isPublished}
              disabled={!canManage || pending}
              aria-label={t("published")}
              onCheckedChange={(v) => {
                const next = { ...settings, isPublished: v === true };
                setSettings(next);
                startTransition(async () => {
                  await updateCalendarSettings(propertyId, next);
                  router.refresh();
                });
              }}
            />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {publicUrl ? (
            <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5">
              <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                {publicUrl}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="bg-card"
                onClick={() => void copyLink()}
              >
                <Icon icon={Copy01Icon} size={16} data-icon="inline-start" />
                {t("copy_link")}
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  {t("preview")}
                </a>
              </Button>
            </div>
          ) : null}
          <label className="flex items-center justify-between gap-4 border-t pt-4 text-sm">
            <span>
              {t("require_form")}
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {form ? t("require_form_hint") : t("require_form_missing")}
              </span>
            </span>
            <Switch
              checked={settings.requireFormFirst}
              disabled={!canManage || pending || !form}
              aria-label={t("require_form")}
              onCheckedChange={(v) => {
                const next = {
                  ...settings,
                  requireFormFirst: v === true,
                  formId: form?.id ?? null,
                };
                setSettings(next);
                startTransition(async () => {
                  await updateCalendarSettings(propertyId, next);
                  router.refresh();
                });
              }}
            />
          </label>
        </CardContent>
      </Card>

      <Card className="hover:border-border">
        <CardHeader>
          <CardTitle>{t("settings_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">{t("duration")}</p>
            <div className="flex flex-wrap gap-1">
              {slotLengths.map((minutes) => {
                const selected = settings.slotDurationMin === minutes;
                return (
                  <button
                    key={minutes}
                    type="button"
                    disabled={!canManage}
                    aria-pressed={selected}
                    className={
                      selected
                        ? "h-7 rounded-full bg-primary px-2.5 text-xs text-primary-foreground"
                        : "h-7 rounded-full bg-secondary px-2.5 text-xs text-secondary-foreground hover:bg-muted disabled:opacity-50"
                    }
                    onClick={() =>
                      setSettings((s) => ({ ...s, slotDurationMin: minutes }))
                    }
                  >
                    {t("duration_option", { minutes })}
                  </button>
                );
              })}
            </div>
          </div>
          <NumberRow
            label={t("buffer")}
            min={0}
            max={120}
            value={settings.bufferMin}
            disabled={!canManage}
            onChange={(bufferMin) => setSettings((s) => ({ ...s, bufferMin }))}
          />
          <NumberRow
            label={t("min_notice")}
            min={0}
            max={72}
            value={settings.minNoticeHours}
            disabled={!canManage}
            onChange={(minNoticeHours) =>
              setSettings((s) => ({ ...s, minNoticeHours }))
            }
          />
          <NumberRow
            label={t("horizon")}
            min={1}
            max={90}
            value={settings.maxDaysAhead}
            disabled={!canManage}
            onChange={(maxDaysAhead) =>
              setSettings((s) => ({ ...s, maxDaysAhead }))
            }
          />
          {canManage ? (
            <div className="flex justify-end pt-4">
              <Button
                variant={settingsDirty ? "default" : "soft"}
                onClick={saveSettings}
                disabled={pending || !settingsDirty}
              >
                {t("save_settings")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="hover:border-border">
        <CardHeader>
          <CardTitle>{t("agent_windows")}</CardTitle>
          <CardDescription className="text-xs">
            {t("agent_windows_hint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <WeekGrid value={cells} onChange={setCells} disabled={!canManage} />
          {canManage ? (
            <div className="flex justify-end">
              <Button
                variant={weekDirty ? "default" : "soft"}
                onClick={saveWeek}
                disabled={pending || !weekDirty}
              >
                {t("save_windows")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (next: number) => void;
}) {
  const t = useTranslations("common");
  const id = React.useId();

  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 text-sm last:border-b-0">
      <span id={id}>{label}</span>
      <NumberField
        aria-labelledby={id}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        decreaseLabel={t("decrease")}
        increaseLabel={t("increase")}
        onChange={onChange}
      />
    </div>
  );
}
