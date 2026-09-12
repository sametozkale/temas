import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("settings");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <SettingsNav />
      <div className="pt-2">{children}</div>
    </div>
  );
}
