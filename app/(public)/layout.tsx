import { ClientMessages } from "@/components/intl/client-messages";
import { PublicFrame } from "@/components/public-frame";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientMessages scope="public">
      <PublicFrame>{children}</PublicFrame>
    </ClientMessages>
  );
}
