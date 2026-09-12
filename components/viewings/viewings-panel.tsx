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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Icon, Copy01Icon, Link01Icon } from "@/components/icons";
import { WeekGrid } from "@/components/viewings/week-grid";
import type { WeekCell } from "@/lib/viewings/week";
import { emptyWeek } from "@/lib/viewings/week";

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("link_title")}</CardTitle>
          {publicUrl ? (
            <Button variant="ghost" size="sm" onClick={() => void copyLink()}>
              <Icon icon={Copy01Icon} size={16} data-icon="inline-start" />
              {t("copy_link")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>
              {t("published")}
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("published_hint")}
              </span>
            </span>
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
          </label>
          {publicUrl ? (
            <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
              <Icon icon={Link01Icon} size={16} />
              {publicUrl}
            </p>
          ) : null}
          <label className="flex items-center justify-between gap-4 text-sm">
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

      <Card>
        <CardHeader>
          <CardTitle>{t("settings_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t("duration")}</FieldLabel>
                <Input
                  type="number"
                  min={15}
                  value={settings.slotDurationMin}
                  disabled={!canManage}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      slotDurationMin: Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel>{t("buffer")}</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={settings.bufferMin}
                  disabled={!canManage}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      bufferMin: Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel>{t("min_notice")}</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={settings.minNoticeHours}
                  disabled={!canManage}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      minNoticeHours: Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel>{t("horizon")}</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={settings.maxDaysAhead}
                  disabled={!canManage}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      maxDaysAhead: Number(e.target.value),
                    }))
                  }
                />
              </Field>
            </div>
          </FieldGroup>
          {canManage ? (
            <Button variant="soft" onClick={saveSettings} disabled={pending}>
              {t("save_settings")}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("agent_windows")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("agent_windows_hint")}
          </p>
          <WeekGrid value={cells} onChange={setCells} disabled={!canManage} />
          {canManage ? (
            <Button onClick={saveWeek} disabled={pending}>
              {t("save_windows")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
