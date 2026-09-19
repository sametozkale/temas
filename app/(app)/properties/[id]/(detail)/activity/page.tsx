import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Activity01Icon } from "@/components/icons";
import { withUserContext } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { listActivity } from "@/lib/properties/queries";

import { loadProperty } from "../../load";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx } = await loadProperty(id);
  const t = await getTranslations("properties.activity");
  const tStatus = await getTranslations("properties.status");
  const tRel = await getTranslations("properties.people.relations");

  const rows = await withUserContext(ctx.user.id, (tx) => listActivity(tx, id));

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Activity01Icon}
        title={t("empty_title")}
        description={t("description")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <ol className="divide-y rounded-lg border bg-card">
        {rows.map((row) => {
          const data = (row.data ?? {}) as Record<string, unknown>;
          const vars: Record<string, string | number | Date> = {};
          for (const [k, v] of Object.entries(data)) {
            if (
              typeof v === "string" ||
              typeof v === "number" ||
              v instanceof Date
            ) {
              vars[k] = v;
            }
          }
          if (typeof data.from === "string") {
            try {
              vars.from = tStatus(data.from);
            } catch {
              vars.from = data.from;
            }
          }
          if (typeof data.to === "string") {
            try {
              vars.to = tStatus(data.to);
            } catch {
              vars.to = data.to;
            }
          }
          if (typeof data.relation === "string") {
            try {
              vars.relation = tRel(data.relation);
            } catch {
              vars.relation = data.relation;
            }
          }
          let copy: string;
          const actionKey = `actions.${row.action}`;
          if (t.has(actionKey)) {
            copy = t(actionKey, vars);
          } else {
            copy = t("actions.unknown", { action: row.action });
          }
          const actor = row.actorName ?? t("system");
          return (
            <li key={row.id} className="flex flex-col gap-0.5 px-4 py-3">
              <p className="text-sm">
                <span className="font-medium">{actor}</span> {copy}
              </p>
              <time
                dateTime={row.createdAt.toISOString()}
                className="text-xs text-muted-foreground"
              >
                {formatDateTime(row.createdAt)}
              </time>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
