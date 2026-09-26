import { FormBuilder } from "@/components/pipeline/form-builder";
import { publicAppUrl } from "@/lib/app-url";
import { withUserContext } from "@/lib/db";
import { can } from "@/lib/permissions";
import { ensurePipeline } from "@/lib/pipeline/ensure";

import { loadProperty } from "../../../load";

export default async function ApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx } = await loadProperty(id);
  const canManage = can(ctx.membership.role, "pipeline.manage");

  const form = await withUserContext(ctx.user.id, async (tx) => {
    const pipeline = await ensurePipeline(tx, id);
    return pipeline.form;
  });

  const origin = await publicAppUrl();
  const formUrl = form.publicToken
    ? new URL(`/f/${form.publicToken}`, origin).toString()
    : null;

  return (
    <FormBuilder
      propertyId={id}
      form={{
        title: form.title,
        schema: form.schema,
        isPublished: form.isPublished,
      }}
      publicUrl={formUrl}
      canManage={canManage}
    />
  );
}
