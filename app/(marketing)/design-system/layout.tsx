import { ClientMessages } from "@/components/intl/client-messages";

/**
 * The catalog renders client components from across the product, so it needs
 * the full message set. The parent marketing layout only ships the strings
 * the public site uses.
 */
export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientMessages scope="all">{children}</ClientMessages>;
}
