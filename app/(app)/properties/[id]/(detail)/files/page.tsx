import { FilesSection } from "@/components/properties/files-section";
import { withUserContext } from "@/lib/db";
import { can } from "@/lib/permissions";
import { listDocuments } from "@/lib/properties/queries";

import { loadProperty } from "../../load";

export default async function FilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx } = await loadProperty(id);
  const docs = await withUserContext(ctx.user.id, (tx) =>
    listDocuments(tx, id),
  );

  return (
    <FilesSection
      propertyId={id}
      canEdit={can(ctx.membership.role, "properties.write")}
      documents={docs.map((d) => ({
        id: d.id,
        kind: d.kind,
        title: d.title,
        createdAt: d.createdAt.toISOString(),
        createdByName: d.createdByName,
        size: d.meta.size,
        shared: d.meta.shared === true,
      }))}
    />
  );
}
