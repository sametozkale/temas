import { getTranslations } from "next-intl/server";

import { WhatsAppMark } from "@/components/brands";
import { completeWhatsAppPairing } from "@/lib/integrations/whatsapp/connect";

export const dynamic = "force-dynamic";

export default async function WhatsAppPairPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const t = await getTranslations("settings.integrations");
  const { token } = await params;
  const result = await completeWhatsAppPairing(token);

  const title =
    result === "ok"
      ? t("whatsapp_pair_ok_title")
      : result === "rate_limited"
        ? t("whatsapp_pair_wait_title")
        : t("whatsapp_pair_invalid_title");
  const body =
    result === "ok"
      ? t("whatsapp_pair_ok")
      : result === "rate_limited"
        ? t("whatsapp_pair_wait")
        : t("whatsapp_pair_invalid");

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
        <WhatsAppMark className="size-7" />
      </span>
      <div className="space-y-1">
        <h1 className="font-serif text-2xl font-medium tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
