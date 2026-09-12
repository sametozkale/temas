import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { PropertyForm } from "@/components/properties/property-form";
import { getAppContext } from "@/lib/auth";
import { requireAbility } from "@/lib/permissions";
import { EMPTY_PROPERTY_FORM } from "@/lib/properties/schema";
import { isValidTimezone } from "@/lib/timezones";

export default async function NewPropertyPage() {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");
  const t = await getTranslations("properties.form");

  const defaults = {
    ...EMPTY_PROPERTY_FORM,
    timezone: isValidTimezone(ctx.workspace.timezone)
      ? ctx.workspace.timezone
      : EMPTY_PROPERTY_FORM.timezone,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-2">
      <PageHeader
        title={t("create_title")}
        description={t("create_description")}
      />
      <p className="pb-4 text-xs text-muted-foreground">
        {t("photos_after_create")}
      </p>
      <PropertyForm
        mode="create"
        defaultValues={defaults}
        cancelHref="/properties"
      />
    </div>
  );
}
