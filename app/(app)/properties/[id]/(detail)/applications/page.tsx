import { getTranslations } from "next-intl/server";

import { FormBuilder } from "@/components/pipeline/form-builder";
import { OwnerLinkCard } from "@/components/pipeline/owner-link-card";
import { PipelineKanban } from "@/components/pipeline/kanban";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { withUserContext } from "@/lib/db";
import { env } from "@/lib/env";
import { can } from "@/lib/permissions";
import { ensurePipeline } from "@/lib/pipeline/ensure";
import { listApplications } from "@/lib/pipeline/queries";

import { loadProperty } from "../../load";

export default async function ApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx } = await loadProperty(id);
  const t = await getTranslations("pipeline");
  const canManage = can(ctx.membership.role, "pipeline.manage");

  const { form, stages, ownerView, applicants } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const pipeline = await ensurePipeline(tx, id);
      const applicants = await listApplications(tx, id);
      return { ...pipeline, applicants };
    },
  );

  const formUrl = form.publicToken
    ? new URL(`/f/${form.publicToken}`, env().APP_URL).toString()
    : null;
  const ownerUrl = new URL(
    `/o/${ownerView.publicToken}`,
    env().APP_URL,
  ).toString();

  return (
    <div className="space-y-8">
      <FormBuilder
        propertyId={id}
        form={{
          title: form.title,
          schema: form.schema,
          isPublished: form.isPublished,
        }}
        publicUrl={formUrl}
        canManage={canManage}
      />
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl tracking-tight">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("hint")}</p>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-3">
            {can(ctx.membership.role, "contracts.manage") ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/properties/${id}/contracts/new`}>
                  {t("create_contract")}
                </Link>
              </Button>
            ) : null}
            <OwnerLinkCard
              propertyId={id}
              url={ownerUrl}
              canManage={canManage}
            />
          </div>
        </div>
        <PipelineKanban
          propertyId={id}
          stages={stages.map((s) => ({
            id: s.id,
            name: s.name,
            color: s.color,
            isTerminal: s.isTerminal,
          }))}
          cards={applicants.map((row) => ({
            id: row.application.id,
            stageId: row.application.stageId,
            fullName: row.contact.fullName,
            email: row.contact.email,
            summary:
              row.application.aiSummary ??
              (typeof row.submission?.answers.employment === "string"
                ? row.submission.answers.employment
                : null),
            score: row.application.score,
          }))}
          canManage={canManage}
        />
      </section>
    </div>
  );
}
