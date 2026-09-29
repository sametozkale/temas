import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalDocument } from "@/components/marketing/legal-document";
import { marketingMetadata } from "@/components/marketing/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.terms");
  return marketingMetadata({
    title: t("meta_title"),
    description: t("meta_description"),
    path: "/terms",
  });
}

export default function TermsPage() {
  return <LegalDocument page="terms" />;
}
