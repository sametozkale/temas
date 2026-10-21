import { ClientMessages } from "@/components/intl/client-messages";
import { caveat } from "@/components/marketing/fonts";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientMessages scope="marketing">
      <div
        className={`theme-light ${caveat.variable} min-h-svh overflow-x-clip bg-background text-foreground`}
      >
        {children}
      </div>
    </ClientMessages>
  );
}
