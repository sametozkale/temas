"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { loadApplicant } from "@/app/(app)/properties/[id]/applications/actions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/format";

type ApplicantPayload = {
  fullName: string;
  email: string | null;
  phone: string | null;
  stageName: string | null;
  score: number | null;
  aiSummary: string | null;
  answers: Record<string, unknown>;
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{data?.fullName ?? t("loading")}</SheetTitle>
          <SheetDescription>
            {[data?.email, data?.phone, data?.stageName]
              .filter(Boolean)
              .join(" · ")}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 overflow-y-auto px-4 pb-6">
          {data?.score != null ? (
            <p className="text-sm">
              {t("score")}: <span className="font-medium">{data.score}</span>
            </p>
          ) : null}
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t("ai_title")}</h3>
            <p className="text-sm text-muted-foreground">
              {data?.aiSummary ?? t("ai_placeholder")}
            </p>
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t("answers")}</h3>
            {Object.keys(data?.answers ?? {}).length ? (
              <div className="space-y-2">
                {Object.entries(data?.answers ?? {}).map(([key, value]) => (
                  <p key={key} className="text-sm">
                    <span className="text-muted-foreground">{key}: </span>
                    {formatAnswer(value)}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("no_answers")}</p>
            )}
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t("attachments")}</h3>
            {data?.attachments.length ? (
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
              <p className="text-sm text-muted-foreground">{t("no_files")}</p>
            )}
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t("history")}</h3>
            {data?.history.length ? (
              <ol className="space-y-2">
                {data.history.map((row) => {
                  const key = `actions.${row.action}`;
                  const copy = tActivity.has(key)
                    ? tActivity(key, {
                        to: typeof row.data.to === "string" ? row.data.to : "",
                        from:
                          typeof row.data.from === "string"
                            ? row.data.from
                            : "",
                      })
                    : row.action;
                  return (
                    <li key={row.id} className="text-sm">
                      <p>{copy}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(new Date(row.createdAt))}
                      </p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">{t("no_history")}</p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatAnswer(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(String).join(", ");
  return String(value);
}
