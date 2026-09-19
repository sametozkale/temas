import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { GmailMark } from "@/components/brands";
import {
  ConnectDevButton,
  DevInboundForm,
  DisconnectButton,
} from "@/components/inbox/dev-inbound-form";
import { IntegrationSetup } from "@/components/settings/integration-setup";
import {
  SettingsGroup,
  SettingsItem,
  SettingsPage,
  SettingsStatus,
} from "@/components/settings/settings-chrome";
import { Button } from "@/components/ui/button";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { integrations as integrationFlags } from "@/lib/env";
import { listIntegrations } from "@/lib/inbox/queries";
import { can } from "@/lib/permissions";

export default async function GmailIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("settings.integrations");
  const ctx = await getAppContext();
  const { error } = await searchParams;
  const rows = await withUserContext(ctx.user.id, (tx) =>
    listIntegrations(tx, ctx.user.id),
  );
  const gmail = rows.find((r) => r.kind === "gmail") ?? null;
  const canManage = can(ctx.membership.role, "integrations.manage");
  const connected = gmail?.status === "connected";
  const oauthReady = integrationFlags.gmail();
  const oauthError =
    error === "gmail_oauth" || error === "gmail_denied" ? error : null;

  const connectedDescription =
    connected && gmail?.externalId
      ? `${t("connected_as", { email: gmail.externalId })}${
          gmail.lastSyncedAt
            ? ` · ${t("last_synced", { when: formatDateTime(gmail.lastSyncedAt) })}`
            : ""
        }`
      : t("gmail_description");

  return (
    <SettingsPage
      title={t("gmail_title")}
      back={{ href: "/settings/integrations", label: t("back") }}
      actions={canManage && connected ? <DisconnectButton /> : undefined}
    >
      {connected ? (
        <SettingsGroup
          footer={
            oauthError ? (
              <span className="text-destructive">
                {t(`errors.${oauthError}`)}
              </span>
            ) : !canManage ? (
              t("staff_only")
            ) : undefined
          }
        >
          <SettingsItem
            mark={<GmailMark className="size-6" />}
            title={t("gmail_title")}
            description={connectedDescription}
          >
            <SettingsStatus tone="success">
              {t("status_connected")}
            </SettingsStatus>
          </SettingsItem>
        </SettingsGroup>
      ) : (
        <SettingsGroup
          title={t("gmail_setup_title")}
          footer={
            oauthError ? (
              <span className="text-destructive">
                {t(`errors.${oauthError}`)}
              </span>
            ) : !canManage ? (
              t("staff_only")
            ) : undefined
          }
        >
          <SettingsItem
            mark={<GmailMark className="size-6" />}
            title={t("gmail_title")}
            description={t("gmail_description")}
            control="below"
          >
            <IntegrationSetup
              steps={[t("gmail_step_1"), t("gmail_step_2"), t("gmail_step_3")]}
            >
              {canManage ? (
                <>
                  {oauthReady ? (
                    <Button size="sm" asChild>
                      <Link href="/api/integrations/gmail/start">
                        {t("connect")}
                      </Link>
                    </Button>
                  ) : null}
                  <ConnectDevButton
                    variant={oauthReady ? "outline" : "default"}
                  />
                </>
              ) : null}
            </IntegrationSetup>
          </SettingsItem>
        </SettingsGroup>
      )}

      {canManage && connected ? (
        <SettingsGroup title={t("development")}>
          <SettingsItem
            control="below"
            title={t("inject_title")}
            description={t("inject_description")}
          >
            <DevInboundForm />
          </SettingsItem>
        </SettingsGroup>
      ) : null}
    </SettingsPage>
  );
}
