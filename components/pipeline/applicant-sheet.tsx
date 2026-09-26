"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";

import { loadApplicant } from "@/app/(app)/properties/[id]/applications/actions";
import { PersonAvatar } from "@/components/identity-marks";
import { Icon, Mail01Icon, SmartPhone01Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { initialsOf } from "@/lib/auth-utils";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import {
  householdLabel,
  householdOf,
  isHouseholdAnswerKey,
} from "@/lib/pipeline/household";

type ApplicantField = { key: string; label: string; type: string };

type ApplicantPayload = {
  fullName: string;
  email: string | null;
  phone: string | null;
  stageName: string | null;
  score: number | null;
  aiSummary: string | null;
  answers: Record<string, unknown>;
  fields: ApplicantField[];
  attachments: { key: string; name: string; url: string | null }[];
  history: {
    id: string;
    action: string;
    createdAt: string;
    data: Record<string, unknown>;
  }[];
};

export function ApplicantSheet({
  propertyId,
  applicationId,
  open,
  onOpenChange,
}: {
  propertyId: string;
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("pipeline.sheet");
  const tActivity = useTranslations("properties.activity");
  const [data, setData] = React.useState<ApplicantPayload | null>(null);

  React.useEffect(() => {
    if (!open || !applicationId) {
      setData(null);
      return;
    }
    let cancelled = false;
    void loadApplicant(propertyId, applicationId).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setData(res.data);
      else setData(null);
    });
    return () => {
      cancelled = true;
    };
  }, [open, applicationId, propertyId]);

  const yesNo = { yes: t("yes"), no: t("no") };
  const household = data ? householdOf(data.fullName, data.answers) : null;
  const heading = household
    ? householdLabel(household, {
        family: (name) => t("family", { name }),
        plus: (name, count) => t("plus", { name, count }),
      })
    : (data?.fullName ?? t("loading"));
  const rows = data ? answerRows(data.answers, data.fields, yesNo) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="gap-3 border-b border-foreground/6 px-5 pt-5 pr-12 pb-4">
          <div className="flex items-start gap-3">
            <PersonAvatar
              initials={initialsOf(data?.fullName ?? heading)}
              className="size-9 shrink-0"
            />
            <div className="min-w-0">
              <SheetTitle className="font-serif text-xl tracking-tight">
                {heading}
              </SheetTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {data?.stageName ? (
                  <Badge variant="outline">{data.stageName}</Badge>
                ) : null}
                {data?.score != null ? (
                  <Badge variant="info">
                    <span className="sr-only">{t("score")} </span>
                    {data.score}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          {data?.email || data?.phone ? (
            <SheetDescription className="space-y-1">
              {data.email ? (
                <span className="flex items-center gap-2">
                  <Icon icon={Mail01Icon} size={16} />
                  <span className="min-w-0 truncate">{data.email}</span>
                </span>
              ) : null}
              {data.phone ? (
                <span className="flex items-center gap-2">
                  <Icon icon={SmartPhone01Icon} size={16} />
                  <span className="min-w-0 truncate">{data.phone}</span>
                </span>
              ) : null}
            </SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{heading}</SheetDescription>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {data ? (
            <>
              <section className="space-y-2">
                <h3 className="text-sm font-medium">{t("ai_title")}</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {data.aiSummary
                    ? leadCapital(data.aiSummary)
                    : t("ai_placeholder")}
                </p>
              </section>

              {household && household.size > 1 ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">{t("household")}</h3>
                  <ul className="space-y-2">
                    {household.members.map((member, index) => (
                      <li
                        key={`${member.name}-${index}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <PersonAvatar
                          initials={
                            member.unnamed ? "?" : initialsOf(member.name)
                          }
                          className="size-7 text-[10px]"
                        />
                        {member.unnamed ? t("unnamed") : member.name}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="space-y-2">
                <h3 className="text-sm font-medium">{t("answers")}</h3>
                {rows.length ? (
                  <dl className="divide-y divide-foreground/6">
                    {rows.map((row) => (
                      <div
                        key={row.key}
                        className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 py-2"
                      >
                        <dt className="text-sm text-muted-foreground">
                          {row.label}
                        </dt>
                        <dd className="text-sm">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("no_answers")}
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">{t("attachments")}</h3>
                {data.attachments.length ? (
                  <ul className="space-y-1 text-sm">
                    {data.attachments.map((file) => (
                      <li key={`${file.key}-${file.name}`}>
                        {file.url ? (
                          <a
                            href={file.url}
                            className="underline-offset-4 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {file.name}
                          </a>
                        ) : (
                          file.name
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("no_files")}
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">{t("history")}</h3>
                {data.history.length ? (
                  <ol className="space-y-3">
                    {data.history.map((row) => {
                      const key = `actions.${row.action}`;
                      const copy = tActivity.has(key)
                        ? tActivity(key, {
                            to:
                              typeof row.data.to === "string"
                                ? row.data.to
                                : "",
                            from:
                              typeof row.data.from === "string"
                                ? row.data.from
                                : "",
                          })
                        : labelFromKey(row.action);
                      return (
                        <li key={row.id}>
                          <p className="text-sm">{leadCapital(copy)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(new Date(row.createdAt))}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("no_history")}
                  </p>
                )}
              </section>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          )}
        </div>

        {applicationId && data ? (
          <div className="border-t border-foreground/6 px-5 py-3">
            <Button size="sm" asChild>
              <Link
                href={`/properties/${propertyId}/contracts/new?applicationId=${applicationId}`}
              >
                {t("create_contract")}
              </Link>
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function answerRows(
  answers: Record<string, unknown>,
  fields: ApplicantField[],
  yesNo: { yes: string; no: string },
) {
  const rows: { key: string; label: string; value: string }[] = [];
  const seen = new Set<string>();
  for (const field of fields) {
    if (isHouseholdAnswerKey(field.key)) continue;
    seen.add(field.key);
    const value = formatAnswer(answers[field.key], field.type, yesNo);
    if (!value) continue;
    rows.push({ key: field.key, label: field.label, value });
  }
  for (const [key, raw] of Object.entries(answers)) {
    if (seen.has(key) || isHouseholdAnswerKey(key)) continue;
    const value = formatAnswer(raw, "text", yesNo);
    if (!value) continue;
    rows.push({ key, label: labelFromKey(key), value });
  }
  return rows;
}

function labelFromKey(key: string) {
  const words = key.replaceAll("_", " ").replaceAll(".", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function leadCapital(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatAnswer(
  value: unknown,
  type: string,
  labels: { yes: string; no: string },
): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "boolean" || type === "boolean") {
    return value ? labels.yes : labels.no;
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => String(item).trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (typeof value === "object") return null;
  const text = String(value).trim();
  if (!text) return null;
  if (type === "date" && /^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(`${text.slice(0, 10)}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return formatDate(date);
  }
  if (type === "number") return formatNumber(text) ?? text;
  return text;
}
