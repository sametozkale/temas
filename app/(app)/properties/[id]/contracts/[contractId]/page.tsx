import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ContractEditor } from "@/components/contracts/editor";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getContract } from "@/lib/contracts/queries";
import { withUserContext } from "@/lib/db";
import { requireAbility } from "@/lib/permissions";

import { loadProperty } from "../../load";

export default async function ContractEditorPage({
  params,
}: {
  params: Promise<{ id: string; contractId: string }>;
}) {
  const { id, contractId } = await params;
  const { ctx } = await loadProperty(id);
  requireAbility(ctx.membership, "contracts.manage");
  const t = await getTranslations("contracts");
  const found = await withUserContext(ctx.user.id, (tx) =>
    getContract(tx, ctx.workspace.id, contractId),
  );
  if (!found || found.contract.propertyId !== id) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={found.templateName ?? t("editor_title")}
        description={found.propertyTitle}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{found.contract.status}</Badge>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/properties/${id}/files`}>{t("files")}</Link>
            </Button>
          </div>
        }
      />
      <ContractEditor
        contractId={found.contract.id}
        bodyMd={found.contract.bodyMd}
        acknowledged={found.contract.disclaimerAcknowledged}
        versions={found.contract.versions}
      />
    </div>
  );
}
