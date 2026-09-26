import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ContractWizardForm } from "@/components/contracts/wizard-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { listContractTemplates } from "@/lib/contracts/queries";
import { withUserContext } from "@/lib/db";
import { requireAbility } from "@/lib/permissions";
import { listApplications } from "@/lib/pipeline/queries";

import { loadProperty } from "../../load";

export default async function NewContractPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ applicationId?: string }>;
}) {
  const { id } = await params;
  const { applicationId } = await searchParams;
  const { ctx, property } = await loadProperty(id);
  requireAbility(ctx.membership, "contracts.manage");
  const t = await getTranslations("contracts");

  const { templates, applications } = await withUserContext(
    ctx.user.id,
    async (tx) => ({
      templates: await listContractTemplates(tx, ctx.workspace.id),
      applications: await listApplications(tx, id),
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("create_title")}
        description={t("create_description")}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/properties/${id}/pipeline`}>{t("back")}</Link>
          </Button>
        }
      />
      <ContractWizardForm
        propertyId={id}
        templates={templates.map((row) => ({ id: row.id, name: row.name }))}
        applications={applications.map((row) => ({
          id: row.application.id,
          name: row.contact.fullName,
        }))}
        defaultApplicationId={applicationId}
        defaults={{
          rent: property.rentAmount ?? "",
          deposit: property.depositAmount ?? "",
          currency: property.currency,
        }}
      />
    </div>
  );
}
