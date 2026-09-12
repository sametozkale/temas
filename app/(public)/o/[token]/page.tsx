import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { OwnerBoard } from "@/components/pipeline/owner-board";
import { db } from "@/lib/db";
import { formatAddress } from "@/lib/format";
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
  const rows = await listApplicationsInStages(db, found.property.id, stageIds);
  const address = formatAddress(found.property.address);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2 border-b pb-6">
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
          {t("kicker")}
        </p>
        <h1 className="font-serif text-3xl tracking-tight">
          {found.property.title}
        </h1>
        {address ? (
          <p className="text-sm text-muted-foreground">{address}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
      </header>
      <OwnerBoard
        token={token}
        cards={rows.map((row) => ({
          id: row.application.id,
          fullName: row.contact.fullName,
          email: row.contact.email,
          stageName: row.stage?.name ?? null,
          score: row.application.score,
          summary: row.application.aiSummary,
          answers: row.submission?.answers ?? {},
        }))}
      />
    </div>
  );
}
