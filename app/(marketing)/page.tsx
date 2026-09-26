import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AskSection } from "@/components/marketing/ask-section";
import { Closing } from "@/components/marketing/closing";
import { ContractsSection } from "@/components/marketing/contracts-section";
import { FeatureTrio } from "@/components/marketing/feature-trio";
import { Hero } from "@/components/marketing/hero";
import { Intro } from "@/components/marketing/intro";
import { Plans } from "@/components/marketing/plans";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { CalendarSection } from "@/components/marketing/slot-mock";
import { TaskSection } from "@/components/marketing/task-section";
import { TrustGrid } from "@/components/marketing/trust-grid";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return {
    title: t("meta_title"),
    description: t("meta_description"),
    openGraph: {
      title: t("meta_title"),
      description: t("meta_description"),
      type: "website",
      siteName: "Temas",
      images: [{ url: "/marketing/agent-keys.webp", width: 900, height: 900 }],
    },
  };
}

export default function MarketingPage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <Intro />
        <FeatureTrio />
        <CalendarSection />
        <AskSection />
        <TaskSection />
        <ContractsSection />
        <TrustGrid />
        <Plans />
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}
