"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import * as React from "react";

import { ContrastIcon, Icon, Moon02Icon, Sun03Icon } from "@/components/icons";
import {
  SettingsGroup,
  SettingsItem,
} from "@/components/settings/settings-chrome";
import { cn } from "@/lib/utils";

const THEMES = ["light", "contrast", "dark"] as const;

type AppearanceTheme = (typeof THEMES)[number];

const THEME_ICONS = {
  light: Sun03Icon,
  contrast: ContrastIcon,
  dark: Moon02Icon,
} as const;

export function AppearanceForm() {
  const t = useTranslations("settings.appearance");
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  const selected: AppearanceTheme =
    theme === "light" || theme === "contrast" || theme === "dark"
      ? theme
      : resolvedTheme === "dark"
        ? "dark"
        : "light";

  return (
    <SettingsGroup title={t("title")}>
      <SettingsItem
        icon={ContrastIcon}
        title={t("theme")}
        description={t("description")}
      >
        <div
          role="radiogroup"
          aria-label={t("theme")}
          className="flex h-8 items-center gap-0.5 rounded-full bg-muted p-0.5"
        >
          {THEMES.map((value) => {
            const active = ready && selected === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!ready}
                onClick={() => setTheme(value)}
                className={cn(
                  "inline-flex h-full cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed",
                  active && "bg-card text-foreground",
                )}
              >
                <Icon icon={THEME_ICONS[value]} size={16} />
                {t(value)}
              </button>
            );
          })}
        </div>
      </SettingsItem>
    </SettingsGroup>
  );
}
