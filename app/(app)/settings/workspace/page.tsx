import { getTranslations } from "next-intl/server";

import { SettingsPage } from "@/components/settings/settings-chrome";
import { getAppContext, initialsOf } from "@/lib/auth";
import { can } from "@/lib/permissions";

import { WorkspaceForm } from "../general-forms";

export default async function SettingsWorkspacePage() {
  const t = await getTranslations("settings");
  const ctx = await getAppContext();

  return (
    <SettingsPage title={t("general.workspace_title")}>
      <WorkspaceForm
        name={ctx.workspace.name}
        legalName={ctx.workspace.legalName ?? ""}
        timezone={ctx.workspace.timezone}
        logoUrl={ctx.workspace.logoUrl}
        initials={initialsOf(ctx.workspace.name, "H")}
        canEdit={can(ctx.membership.role, "workspace.update")}
      />
    </SettingsPage>
  );
}
