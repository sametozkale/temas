import { AppShell } from "@/components/app-shell";

/**
 * Protected workspace area. Auth guard + real workspace/user data arrive in
 * FAZ 1; for now the shell renders with placeholders.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
