import type { ReactNode } from "react";

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="pt-4">{children}</div>;
}
