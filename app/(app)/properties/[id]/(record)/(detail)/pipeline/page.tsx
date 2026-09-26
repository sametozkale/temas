import { getTranslations } from "next-intl/server";

import { CreateContractControl } from "@/components/pipeline/create-contract-control";
import { OwnerLinkCard } from "@/components/pipeline/owner-link-card";
import { PipelineKanban } from "@/components/pipeline/kanban";
import { publicAppUrl } from "@/lib/app-url";
import { withUserContext } from "@/lib/db";
import { can } from "@/lib/permissions";
import { ensurePipeline } from "@/lib/pipeline/ensure";
import {
  householdCardLine,
  householdCompanions,
  householdLabel,
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
  const stageOrder = new Map(stages.map((stage) => [stage.id, stage.position]));
  const households = applicants
    .map((row) => {
      const household = householdOf(
        row.contact.fullName,
        row.submission?.answers ?? null,
      );
      return {
        id: row.application.id,
        stageId: row.application.stageId,
        label: householdLabel(household, {
          family: (name) => t("sheet.family", { name }),
          plus: (name, count) => t("sheet.plus", { name, count }),
        }),
        stage: row.stage?.name ?? null,
      };
    })
    .sort(
      (a, b) =>
        (stageOrder.get(a.stageId ?? "") ?? 99) -
        (stageOrder.get(b.stageId ?? "") ?? 99),
    );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-medium">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("hint")}</p>
        </div>
        {can(ctx.membership.role, "contracts.manage") ? (
          <CreateContractControl propertyId={id} households={households} />
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
          const answers = row.submission?.answers ?? null;
          const household = householdOf(row.contact.fullName, answers);
          const companions = householdCompanions(household);
          const line = householdCardLine(
            household,
            typeof answers?.employment === "string" ? answers.employment : null,
          );
          const others =
            companions.names.length === 0 && companions.unnamed
              ? t("card.others", { count: companions.unnamed })
              : "";
          const summary =
            line && others
              ? `${line} · ${others}`
              : line || others || row.application.aiSummary;
          return {
            id: row.application.id,
            stageId: row.application.stageId,
            fullName: household.primary,
            email: row.contact.email,
            summary,
            score: row.application.score,
          };
        })}
        canManage={canManage}
      />
    </div>
  );
}
