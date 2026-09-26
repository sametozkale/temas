import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { GmailMark, WhatsAppMark } from "@/components/brands";
import { ArrowRight01Icon, Icon, Tick02Icon } from "@/components/icons";
import {
  SettingsGroup,
  SettingsItem,
  SettingsStatus,
} from "@/components/settings/settings-chrome";
import { can } from "@/lib/permissions";
import type { WorkspaceRole } from "@/lib/roles";

type IntegrationRow = {
  id: string;
  kind: "gmail" | "outlook" | "whatsapp";
  status: string;
  externalId: string | null;
  lastSyncedAt: Date | null;
};

export async function IntegrationsPanel({
  gmail,
  whatsapp,
  role,
  oauthError,
  calendar = false,
  dev = false,
}: {
  gmail: IntegrationRow | null;
  whatsapp: IntegrationRow | null;
  role: WorkspaceRole;
  oauthError?: string | null;
  calendar?: boolean;
  dev?: boolean;
}) {
  const t = await getTranslations("settings.integrations");
  const canManage = can(role, "integrations.manage");
  const connected = gmail?.status === "connected";
  const waConnected = whatsapp?.status === "connected";

  const gmailDescription = !connected
    ? t("google_description")
    : dev
      ? t("google_dev_connected", { email: gmail?.externalId ?? "" })
      : calendar
        ? t("google_connected", { email: gmail?.externalId ?? "" })
        : t("google_mail_only", { email: gmail?.externalId ?? "" });

  return (
    <SettingsGroup
      title={t("inbox_group")}
      footer={
        oauthError ? (
          <span className="text-destructive">{t(`errors.${oauthError}`)}</span>
        ) : !canManage ? (
          t("staff_only")
        ) : undefined
      }
    >
      <IntegrationRowLink
        href="/settings/integrations/gmail"
        mark={<GmailMark className="size-6" />}
        title={t("google_title")}
        description={gmailDescription}
        connected={connected}
        connectedLabel={t("status_connected")}
        disconnectedLabel={t("status_disconnected")}
      />
      <IntegrationRowLink
        href="/settings/integrations/whatsapp"
        mark={<WhatsAppMark className="size-[22px]" />}
        title={t("whatsapp_title")}
        description={
          waConnected ? t("whatsapp_connected") : t("whatsapp_description")
        }
        connected={waConnected}
        connectedLabel={t("status_connected")}
        disconnectedLabel={t("status_disconnected")}
      />
    </SettingsGroup>
  );
}

function IntegrationRowLink({
  href,
  mark,
  title,
  description,
  connected,
  connectedLabel,
  disconnectedLabel,
}: {
  href: string;
  mark: ReactNode;
  title: string;
  description: string;
  connected: boolean;
  connectedLabel: string;
  disconnectedLabel: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <SettingsItem
        mark={mark}
        title={title}
        description={description}
        className="hover:border-foreground/10"
      >
        <span className="flex items-center gap-2">
          <SettingsStatus tone={connected ? "success" : "muted"}>
            {connected ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon icon={Tick02Icon} size={16} />
                {connectedLabel}
              </span>
            ) : (
              disconnectedLabel
            )}
          </SettingsStatus>
          <Icon
            icon={ArrowRight01Icon}
            size={16}
            className="text-muted-foreground/50"
          />
        </span>
      </SettingsItem>
    </Link>
  );
}
