import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { integrations as integrationFlags } from "@/lib/env";
import { can } from "@/lib/permissions";
import type { WorkspaceRole } from "@/lib/roles";

import {
  ConnectDevButton,
  DevInboundForm,
  DisconnectButton,
} from "@/components/inbox/dev-inbound-form";

type IntegrationRow = {
  id: string;
  kind: "gmail" | "outlook" | "whatsapp";
  status: string;
  externalId: string | null;
  lastSyncedAt: Date | null;
};

export async function IntegrationsPanel({
  gmail,
  role,
  oauthError,
}: {
  gmail: IntegrationRow | null;
  role: WorkspaceRole;
  oauthError?: string | null;
}) {
  const t = await getTranslations("settings.integrations");
  const canManage = can(role, "integrations.manage");
  const oauthReady = integrationFlags.gmail();
  const connected = gmail?.status === "connected";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{t("gmail_title")}</CardTitle>
              <CardDescription>{t("gmail_description")}</CardDescription>
            </div>
            <Badge variant={connected ? "success" : "secondary"}>
              {connected ? t("status_connected") : t("status_disconnected")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {oauthError ? (
            <p className="text-sm text-destructive">
              {t(`errors.${oauthError}`)}
            </p>
          ) : null}
          {connected && gmail?.externalId ? (
            <p className="text-sm text-muted-foreground">
              {t("connected_as", { email: gmail.externalId })}
              {gmail.lastSyncedAt
                ? ` · ${t("last_synced", { when: formatDateTime(gmail.lastSyncedAt) })}`
                : null}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("gmail_empty")}</p>
          )}
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {oauthReady ? (
                <Button size="sm" asChild>
                  <Link href="/api/integrations/gmail/start">
                    {t("connect")}
                  </Link>
                </Button>
              ) : null}
              {!connected ? <ConnectDevButton /> : <DisconnectButton />}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("staff_only")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{t("whatsapp_title")}</CardTitle>
              <CardDescription>{t("whatsapp_description")}</CardDescription>
            </div>
            <Badge variant="secondary">{t("status_soon")}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("whatsapp_stub")}</p>
        </CardContent>
      </Card>

      {canManage && connected ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("inject_title")}</CardTitle>
            <CardDescription>{t("inject_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <DevInboundForm />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
