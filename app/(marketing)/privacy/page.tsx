import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalDocument } from "@/components/marketing/legal-document";
import { marketingMetadata } from "@/components/marketing/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.privacy");
  return marketingMetadata({
    title: t("meta_title"),
    description: t("meta_description"),
    path: "/privacy",
  });
}

export default function PrivacyPage() {
  return <LegalDocument page="privacy" />;
}
