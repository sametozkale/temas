"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";
import { startTransition, useActionState } from "react";
import { toast } from "sonner";

import {
  Calendar03Icon,
  Clock01Icon,
  File01Icon,
  Notification01Icon,
  UserCheck01Icon,
  type IconSvgElement,
} from "@/components/icons";
import {
  SettingsGroup,
  SettingsItem,
} from "@/components/settings/settings-chrome";
import { Switch } from "@/components/ui/switch";
import {
  type NotificationChannel,
  type NotificationPrefs,
  type NotificationType,
} from "@/lib/notifications/prefs";

import { updateNotificationPreferences, type SettingsState } from "../actions";

const TYPE_ICONS: Record<NotificationType, IconSvgElement> = {
  digest: Notification01Icon,
  viewings: Calendar03Icon,
  viewing_reminders: Clock01Icon,
  applications: File01Icon,
  owner_decisions: UserCheck01Icon,
};

const DIGEST_TYPES = ["digest"] as const satisfies NotificationType[];
const LISTING_TYPES = [
  "viewings",
  "viewing_reminders",
  "applications",
  "owner_decisions",
] as const satisfies NotificationType[];

export function NotificationsForm({
  prefs: initialPrefs,
  hasPhone,
}: {
  prefs: NotificationPrefs;
  hasPhone: boolean;
}) {
  const t = useTranslations("settings.notifications");
  const [prefs, setPrefs] = React.useState(initialPrefs);
  const [state, action, pending] = useActionState<
    SettingsState | undefined,
    FormData
  >(updateNotificationPreferences, undefined);

  React.useEffect(() => {
    if (state?.ok) toast.success(t("saved"));
  }, [state, t]);

  function setChannel(
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean,
  ) {
    const next: NotificationPrefs = {
      ...prefs,
      [type]: { ...prefs[type], [channel]: enabled },
    };
    setPrefs(next);
    const fd = new FormData();
    fd.set("prefs", JSON.stringify(next));
    startTransition(() => {
      action(fd);
    });
  }

  return (
    <>
      <SettingsGroup title={t("digest_title")}>
        {DIGEST_TYPES.map((type) => (
          <TypeRow
            key={type}
            type={type}
            prefs={prefs}
            hasPhone={hasPhone}
            pending={pending}
            onChange={setChannel}
          />
        ))}
      </SettingsGroup>
      <SettingsGroup
        title={t("listings_title")}
        footer={
          hasPhone ? (
            t("whatsapp_footer")
          ) : (
            <>
              {t("whatsapp_needs_phone")}{" "}
              <Link
                href="/settings"
                className="underline-offset-4 hover:underline"
              >
                {t("whatsapp_add_phone")}
              </Link>
            </>
          )
        }
      >
        {LISTING_TYPES.map((type) => (
          <TypeRow
            key={type}
            type={type}
            prefs={prefs}
            hasPhone={hasPhone}
            pending={pending}
            onChange={setChannel}
          />
        ))}
      </SettingsGroup>
    </>
  );
}

function TypeRow({
  type,
  prefs,
  hasPhone,
  pending,
  onChange,
}: {
  type: NotificationType;
  prefs: NotificationPrefs;
  hasPhone: boolean;
  pending: boolean;
  onChange: (
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean,
  ) => void;
}) {
  const t = useTranslations("settings.notifications");
  return (
    <SettingsItem
      icon={TYPE_ICONS[type]}
      title={t(`types.${type}`)}
      description={t(`types.${type}_description`)}
    >
      <div className="flex items-center gap-4">
        <ChannelSwitch
          id={`${type}-email`}
          label={t("channel_email")}
          checked={prefs[type].email}
          disabled={pending}
          onCheckedChange={(next) => onChange(type, "email", next)}
        />
        <ChannelSwitch
          id={`${type}-whatsapp`}
          label={t("channel_whatsapp")}
          checked={prefs[type].whatsapp}
          disabled={pending || !hasPhone}
          onCheckedChange={(next) => onChange(type, "whatsapp", next)}
        />
      </div>
    </SettingsItem>
  );
}

function ChannelSwitch({
  id,
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  );
}
