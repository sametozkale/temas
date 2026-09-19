import { getTranslations } from "next-intl/server";

import { TemplateEditor } from "@/app/(app)/settings/templates/template-editor";
import { SettingsPage } from "@/components/settings/settings-chrome";
import { getAppContext } from "@/lib/auth";
import { listContractTemplates } from "@/lib/contracts/queries";
import { templateKindForName } from "@/lib/contracts/seed";
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
    <SettingsPage title={t("title")}>
      <TemplateEditor
        templates={templates.map((row) => ({
          id: row.id,
          name: row.name,
          bodyMd: row.bodyMd,
          kind: templateKindForName(row.name),
        }))}
      />
    </SettingsPage>
  );
}
