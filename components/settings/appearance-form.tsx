"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import * as React from "react";

import { ComputerIcon, Icon, Moon02Icon, Sun03Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun03Icon, labelKey: "light" },
  { value: "dark", icon: Moon02Icon, labelKey: "dark" },
  { value: "system", icon: ComputerIcon, labelKey: "system" },
] as const;

export function AppearanceForm() {
  const t = useTranslations("settings.appearance");
  const { theme, setTheme } = useTheme();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  const current = ready ? (theme ?? "system") : "system";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={current === option.value ? "default" : "outline"}
              className={cn(!ready && "pointer-events-none")}
              onClick={() => setTheme(option.value)}
            >
              <Icon icon={option.icon} size={16} data-icon="inline-start" />
              {t(option.labelKey)}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
