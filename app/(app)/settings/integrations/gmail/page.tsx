import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { GmailMark } from "@/components/brands";
import {
  DevInboundForm,
  DisconnectButton,
} from "@/components/inbox/dev-inbound-form";
import { Calendar03Icon } from "@/components/icons";
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
import { integrations } from "@/lib/db/schema";
import { integrations as integrationFlags } from "@/lib/env";
import { listIntegrations } from "@/lib/inbox/queries";
import {
  googleIncludesCalendar,
  googleIsDevMailbox,
} from "@/lib/integrations/google/calendar";
import { can } from "@/lib/permissions";

export default async function GmailIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("settings.integrations");
  const ctx = await getAppContext();
  const { error } = await searchParams;
  const { gmail, grant } = await withUserContext(ctx.user.id, async (tx) => {
    const [list, creds] = await Promise.all([
      listIntegrations(tx, ctx.user.id),
      tx
        .select({ credentials: integrations.credentials })
        .from(integrations)
        .where(
          and(
            eq(integrations.userId, ctx.user.id),
            eq(integrations.kind, "gmail"),
          ),
        )
        .limit(1),
    ]);
    return {
      gmail: list.find((row) => row.kind === "gmail") ?? null,
      grant: creds[0]?.credentials ?? null,
    };
  });
  const canManage = can(ctx.membership.role, "integrations.manage");
  const connected = gmail?.status === "connected";
  const oauthReady = integrationFlags.gmail();
  const oauthError =
    error === "gmail_oauth" || error === "gmail_denied" ? error : null;
  const calendar = googleIncludesCalendar(grant);
  const dev = googleIsDevMailbox(grant);
  const footer = oauthError ? (
    <span className="text-destructive">{t(`errors.${oauthError}`)}</span>
  ) : !canManage ? (
    t("staff_only")
  ) : undefined;

  return (
    <SettingsPage
      title={t("google_title")}
      back={{ href: "/settings/integrations", label: t("back") }}
      actions={canManage && connected ? <DisconnectButton /> : undefined}
    >
      {connected ? (
        <SettingsGroup footer={footer}>
          <SettingsItem
            mark={<GmailMark className="size-6" />}
            title={t("mail_title")}
            description={
              gmail?.externalId
                ? `${gmail.externalId} · ${t("mail_connected")}`
                : t("mail_connected")
            }
          >
            <SettingsStatus tone="success">{t("status_connected")}</SettingsStatus>
          </SettingsItem>
          <SettingsItem
            icon={Calendar03Icon}
            title={t("calendar_title")}
            description={
              calendar
                ? t("calendar_connected")
                : dev
                  ? t("calendar_dev")
                  : t("calendar_missing")
            }
          >
            {calendar ? (
              <SettingsStatus tone="success">
                {t("status_connected")}
              </SettingsStatus>
            ) : canManage && oauthReady ? (
              <Button size="sm" variant="outline" asChild>
                <Link href="/api/integrations/gmail/start">{t("reconnect")}</Link>
              </Button>
            ) : (
              <SettingsStatus>{t("status_disconnected")}</SettingsStatus>
            )}
          </SettingsItem>
        </SettingsGroup>
      ) : (
        <SettingsGroup title={t("google_setup_title")} footer={footer}>
          <SettingsItem
            mark={<GmailMark className="size-6" />}
            title={t("google_title")}
            description={t("google_description")}
            control="below"
          >
            <IntegrationSetup
              steps={[
                t("google_step_1"),
                t("google_step_2"),
                t("google_step_3"),
              ]}
            >
              {canManage ? (
                <Button size="sm" asChild>
                  <Link href="/api/integrations/gmail/start">{t("connect")}</Link>
                </Button>
              ) : null}
            </IntegrationSetup>
          </SettingsItem>
        </SettingsGroup>
      )}

      {canManage && connected && process.env.NODE_ENV !== "production" ? (
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
