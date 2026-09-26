import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { OwnerLinkCard } from "@/components/pipeline/owner-link-card";
import { PipelineKanban } from "@/components/pipeline/kanban";
import { Button } from "@/components/ui/button";
import { publicAppUrl } from "@/lib/app-url";
import { withUserContext } from "@/lib/db";
import { can } from "@/lib/permissions";
import { ensurePipeline } from "@/lib/pipeline/ensure";
import {
  householdLabel,
  householdMemberLine,
  householdOf,
} from "@/lib/pipeline/household";
import { listApplications } from "@/lib/pipeline/queries";

import { loadProperty } from "../../../load";

export default async function PipelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx } = await loadProperty(id);
  const t = await getTranslations("pipeline");
  const canManage = can(ctx.membership.role, "pipeline.manage");

  const { stages, ownerView, applicants } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const pipeline = await ensurePipeline(tx, id);
      const applicants = await listApplications(tx, id);
      return { ...pipeline, applicants };
    },
  );

  const origin = await publicAppUrl();
  const ownerUrl = new URL(`/o/${ownerView.publicToken}`, origin).toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-medium">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("hint")}</p>
        </div>
        {can(ctx.membership.role, "contracts.manage") ? (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/properties/${id}/contracts/new`}>
              {t("create_contract")}
            </Link>
          </Button>
        ) : null}
      </div>
      <OwnerLinkCard propertyId={id} url={ownerUrl} canManage={canManage} />
      <PipelineKanban
        propertyId={id}
        stages={stages.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          isTerminal: s.isTerminal,
        }))}
        cards={applicants.map((row) => {
          const household = householdOf(
            row.contact.fullName,
            row.submission?.answers ?? null,
          );
          return {
            id: row.application.id,
            stageId: row.application.stageId,
            fullName: householdLabel(household, {
              family: (name) => t("sheet.family", { name }),
              plus: (name, count) => t("sheet.plus", { name, count }),
            }),
            memberLine:
              household.size > 1 ? householdMemberLine(household) : null,
            email: row.contact.email,
            summary:
              row.application.aiSummary ??
              (typeof row.submission?.answers.employment === "string"
                ? row.submission.answers.employment
                : null),
            score: row.application.score,
          };
        })}
        canManage={canManage}
      />
    </div>
  );
}
