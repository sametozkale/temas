"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Moon02Icon } from "@/components/icons";
import {
  SettingsGroup,
  SettingsItem,
} from "@/components/settings/settings-chrome";
import { Switch } from "@/components/ui/switch";

export function AppearanceForm() {
  const t = useTranslations("settings.appearance");
  const { resolvedTheme, setTheme } = useTheme();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  const dark = ready && resolvedTheme === "dark";

  return (
    <SettingsGroup title={t("title")}>
      <SettingsItem
        icon={Moon02Icon}
        title={t("theme")}
        description={t("description")}
      >
        <Switch
          checked={dark}
          disabled={!ready}
          aria-label={t("theme")}
          onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
        />
      </SettingsItem>
    </SettingsGroup>
  );
}
