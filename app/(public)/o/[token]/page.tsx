import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { OwnerBoard } from "@/components/pipeline/owner-board";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { forms } from "@/lib/db/schema";
import {
  householdLabel,
  householdMemberLine,
  householdOf,
} from "@/lib/pipeline/household";
import {
  getOwnerViewByToken,
  listApplicationsInStages,
} from "@/lib/pipeline/queries";

export const revalidate = 30;

export default async function OwnerViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("owner_view");
  const found = await getOwnerViewByToken(db, token);
  if (!found || found.property.deletedAt) notFound();
  if (found.view.expiresAt && found.view.expiresAt.getTime() < Date.now()) {
    notFound();
  }

  const stageIds = found.view.showStages ?? [];
  const [rows, form] = await Promise.all([
    listApplicationsInStages(db, found.property.id, stageIds),
    db
      .select({ schema: forms.schema })
      .from(forms)
      .where(eq(forms.propertyId, found.property.id))
      .limit(1)
      .then((foundForms) => foundForms[0] ?? null),
  ]);
  const labels = new Map(
    (form?.schema ?? []).map((field) => [field.key, field.label]),
  );
  const cards = rows.map((row) => {
    const household = householdOf(
      row.contact.fullName,
      row.submission?.answers ?? null,
    );
    return {
      id: row.application.id,
      fullName: householdLabel(household, {
        family: (name) => t("family", { name }),
        plus: (name, count) => t("plus", { name, count }),
      }),
      memberLine: household.size > 1 ? householdMemberLine(household) : null,
      email: row.contact.email,
      stageName: row.stage?.name ?? null,
      score: row.application.score,
      summary: row.application.aiSummary,
      facts: ownerFacts(row.submission?.answers ?? {}, labels, {
        yes: t("yes"),
        no: t("no"),
      }),
    };
  });

  return (
    <div
      className={
        cards.length === 0
          ? "mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-5xl flex-col"
          : "mx-auto w-full max-w-5xl"
      }
    >
      <header className="space-y-2 border-b border-foreground/10 pb-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {t("kicker")}
          </p>
          <Badge variant="outline" asChild className="h-auto bg-card px-3 py-1">
            <a href="/" target="_blank" rel="noopener noreferrer">
              {t("powered_by")}
            </a>
          </Badge>
        </div>
        <h1 className="font-serif text-xl font-medium tracking-tight">
          {found.property.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
      </header>
      <div
        className={
          cards.length === 0 ? "flex flex-1 items-center py-10" : "pt-8"
        }
      >
        <OwnerBoard token={token} cards={cards} />
      </div>
    </div>
  );
}

function ownerFacts(
  answers: Record<string, unknown>,
  labels: Map<string, string>,
  yesNo: { yes: string; no: string },
) {
  const facts: { label: string; value: string }[] = [];
  for (const [key, raw] of Object.entries(answers)) {
    if (key === "household" || key === "occupants") continue;
    const value = formatOwnerAnswer(raw, yesNo);
    if (!value) continue;
    facts.push({
      label: labels.get(key) ?? key.replaceAll("_", " "),
      value,
    });
    if (facts.length === 6) break;
  }
  return facts;
}

function formatOwnerAnswer(
  value: unknown,
  yesNo: { yes: string; no: string },
): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "boolean") return value ? yesNo.yes : yesNo.no;
  if (Array.isArray(value)) {
    const parts = value.map((item) => String(item).trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (typeof value === "object") return null;
  const text = String(value).trim();
  return text || null;
}
