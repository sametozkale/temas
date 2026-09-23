import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ArrowRight01Icon, File01Icon, Icon, PlusSignIcon } from "@/components/icons";
import {
  SettingsGroup,
  SettingsItem,
  SettingsPage,
} from "@/components/settings/settings-chrome";
import { Button } from "@/components/ui/button";
import { getAppContext } from "@/lib/auth";
import { TEMPLATE_KIND_ORDER } from "@/lib/contracts/placeholders";
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
  const rank = new Map(TEMPLATE_KIND_ORDER.map((kind, i) => [kind, i]));
  const ranked = [...templates].sort((a, b) => {
    const diff =
      (rank.get(templateKindForName(a.name)) ?? 99) -
      (rank.get(templateKindForName(b.name)) ?? 99);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  return (
    <SettingsPage
      title={t("title")}
      actions={
        <Button variant="pill" size="sm" asChild>
          <Link href="/settings/templates/new">
            <Icon icon={PlusSignIcon} size={16} />
            {t("new_title")}
          </Link>
        </Button>
      }
    >
      <SettingsGroup title={t("list_title")} footer={t("list_description")}>
        {ranked.map((row) => {
          const kind = templateKindForName(row.name);
          return (
            <Link
              key={row.id}
              href={`/settings/templates/${row.id}`}
              className="block rounded-2xl outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <SettingsItem
                icon={File01Icon}
                title={row.name}
                description={t(`kinds.${kind}`)}
                className="hover:border-foreground/10"
              >
                <Icon
                  icon={ArrowRight01Icon}
                  size={16}
                  className="text-muted-foreground/50"
                />
              </SettingsItem>
            </Link>
          );
        })}
      </SettingsGroup>
    </SettingsPage>
  );
}
