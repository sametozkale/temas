import { getTranslations } from "next-intl/server";

import { TemplateEditor } from "@/app/(app)/settings/templates/template-editor";
import { getAppContext } from "@/lib/auth";
import { listContractTemplates } from "@/lib/contracts/queries";
import { withUserContext } from "@/lib/db";
import { requireAbility } from "@/lib/permissions";

export default async function SettingsTemplatesPage() {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "templates.manage");
  const t = await getTranslations("settings.templates");
  const templates = await withUserContext(ctx.user.id, (tx) =>
    listContractTemplates(tx, ctx.workspace.id),
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <TemplateEditor
        templates={templates.map((row) => ({
          id: row.id,
          name: row.name,
          bodyMd: row.bodyMd,
        }))}
      />
    </div>
  );
}
