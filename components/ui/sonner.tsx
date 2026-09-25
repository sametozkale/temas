"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import {
  Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Loading03Icon,
  CancelCircleIcon,
} from "@/components/icons";

// Soft toasts: no richColors, hairline border, token colors only (docs/01 §4)
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const toastTheme = theme === "contrast" ? "light" : theme;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Sonner
      theme={(mounted ? toastTheme : "system") as ToasterProps["theme"]}
      className="toaster group"
      richColors={false}
      icons={{
        success: (
          <Icon
            icon={CheckmarkCircle02Icon}
            size={16}
            className="text-success"
          />
        ),
        info: (
          <Icon icon={InformationCircleIcon} size={16} className="text-info" />
        ),
        warning: <Icon icon={Alert02Icon} size={16} className="text-warning" />,
        error: (
          <Icon
            icon={CancelCircleIcon}
            size={16}
            className="text-destructive"
          />
        ),
        loading: (
          <Icon icon={Loading03Icon} size={16} className="animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast shadow-none border",
        },
        style: {
          padding: "10px 16px",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
