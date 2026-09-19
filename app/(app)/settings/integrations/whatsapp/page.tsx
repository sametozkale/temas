import { getTranslations } from "next-intl/server";

import { WhatsAppMark } from "@/components/brands";
import {
  ConnectWhatsAppButton,
  DisconnectWhatsAppButton,
  WhatsAppInboundForm,
} from "@/components/inbox/dev-inbound-form";
import { IntegrationSetup } from "@/components/settings/integration-setup";
import {
  SettingsGroup,
  SettingsItem,
  SettingsPage,
  SettingsStatus,
} from "@/components/settings/settings-chrome";
import { WhatsAppPairingWatch } from "@/components/settings/whatsapp-pairing-watch";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { listIntegrations } from "@/lib/inbox/queries";
import {
  createWhatsAppPairToken,
  whatsappPairUrlFromRequest,
} from "@/lib/integrations/whatsapp/pair";
import { can } from "@/lib/permissions";
import { qrSvg } from "@/lib/qr";

export default async function WhatsAppIntegrationPage() {
  const t = await getTranslations("settings.integrations");
  const ctx = await getAppContext();
  const rows = await withUserContext(ctx.user.id, (tx) =>
    listIntegrations(tx, ctx.user.id),
  );
  const whatsapp = rows.find((r) => r.kind === "whatsapp") ?? null;
  const canManage = can(ctx.membership.role, "integrations.manage");
  const connected = whatsapp?.status === "connected";
  const qr = connected
    ? ""
    : qrSvg(
        await whatsappPairUrlFromRequest(
          createWhatsAppPairToken(ctx.user.id, ctx.workspace.id),
        ),
      );

  return (
    <SettingsPage
      title={t("whatsapp_title")}
      back={{ href: "/settings/integrations", label: t("back") }}
      actions={
        canManage && connected ? <DisconnectWhatsAppButton /> : undefined
      }
    >
      {connected ? (
        <SettingsGroup footer={!canManage ? t("staff_only") : undefined}>
          <SettingsItem
            mark={<WhatsAppMark className="size-[22px]" />}
            title={t("whatsapp_title")}
            description={t("whatsapp_connected")}
          >
            <SettingsStatus tone="success">
              {t("status_connected")}
            </SettingsStatus>
          </SettingsItem>
        </SettingsGroup>
      ) : (
        <SettingsGroup
          title={t("whatsapp_setup_title")}
          footer={!canManage ? t("staff_only") : undefined}
        >
          <SettingsItem
            mark={<WhatsAppMark className="size-[22px]" />}
            title={t("whatsapp_title")}
            description={t("whatsapp_description")}
            control="below"
          >
            <IntegrationSetup
              steps={[
                t("whatsapp_step_1"),
                t("whatsapp_step_2"),
                t("whatsapp_step_3"),
              ]}
              qr={qr}
              qrLabel={t("whatsapp_qr_label")}
              hint={t("whatsapp_qr_hint")}
            >
              {canManage ? (
                <ConnectWhatsAppButton
                  variant="default"
                  label={t("whatsapp_scanned")}
                />
              ) : null}
            </IntegrationSetup>
            {canManage ? <WhatsAppPairingWatch /> : null}
          </SettingsItem>
        </SettingsGroup>
      )}

      {canManage && connected ? (
        <SettingsGroup title={t("development")}>
          <SettingsItem
            control="below"
            title={t("inject_wa_title")}
            description={t("inject_wa_description")}
          >
            <WhatsAppInboundForm />
          </SettingsItem>
        </SettingsGroup>
      ) : null}
    </SettingsPage>
  );
}
