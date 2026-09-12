import { IntegrationsPanel } from "@/components/inbox/integrations-panel";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { listIntegrations } from "@/lib/inbox/queries";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await getAppContext();
  const { error } = await searchParams;
  const rows = await withUserContext(ctx.user.id, (tx) =>
    listIntegrations(tx, ctx.workspace.id),
  );
  const gmail = rows.find((r) => r.kind === "gmail") ?? null;
  const allowedError =
    error === "gmail_oauth" || error === "gmail_denied" ? error : null;

  return (
    <IntegrationsPanel
      gmail={gmail}
      role={ctx.membership.role}
      oauthError={allowedError}
    />
  );
}
