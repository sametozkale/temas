import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { TemplateEditor } from "@/app/(app)/settings/templates/template-editor";
import { SettingsPage } from "@/components/settings/settings-chrome";
import { getAppContext } from "@/lib/auth";
import { getContractTemplate } from "@/lib/contracts/queries";
import { withUserContext } from "@/lib/db";
import { requireAbility } from "@/lib/permissions";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "templates.manage");
  const t = await getTranslations("settings.templates");
  const template = await withUserContext(ctx.user.id, (tx) =>
    getContractTemplate(tx, ctx.workspace.id, id),
  );
  if (!template) notFound();

  return (
    <SettingsPage
      title={template.name}
      back={{ href: "/settings/templates", label: t("back") }}
    >
      <TemplateEditor
        template={{
          id: template.id,
          name: template.name,
          bodyMd: template.bodyMd,
        }}
      />
    </SettingsPage>
  );
}
