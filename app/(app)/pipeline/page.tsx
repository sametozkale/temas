import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Building03Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { listPropertiesWithPipeline } from "@/lib/pipeline/queries";

export default async function PipelineIndexPage() {
  const ctx = await getAppContext();
  const t = await getTranslations("pipeline");
  const rows = await withUserContext(ctx.user.id, (tx) =>
    listPropertiesWithPipeline(tx, ctx.workspace.id),
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("index_title")} description={t("index_hint")} />
      {rows.length === 0 ? (
        <EmptyState
          icon={Building03Icon}
          title={t("index_empty_title")}
          description={t("index_empty_description")}
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/properties/${row.id}/applications`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-accent"
              >
                <span className="font-medium">{row.title}</span>
                <Badge variant="secondary">
                  {t("index_count", { count: row.applicantCount })}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
