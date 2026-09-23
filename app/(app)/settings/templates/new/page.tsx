import { getTranslations } from "next-intl/server";

import { TemplateEditor } from "@/app/(app)/settings/templates/template-editor";
import { SettingsPage } from "@/components/settings/settings-chrome";
import { getAppContext } from "@/lib/auth";
import { requireAbility } from "@/lib/permissions";

export default async function NewTemplatePage() {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "templates.manage");
  const t = await getTranslations("settings.templates");

  return (
    <SettingsPage
      title={t("new_title")}
      back={{ href: "/settings/templates", label: t("back") }}
    >
      <TemplateEditor template={null} />
    </SettingsPage>
  );
}
