import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FeaturePage, type FeaturePageId } from "@/components/marketing/feature-page";
import { marketingMetadata } from "@/components/marketing/metadata";

const PAGES = ["viewings", "inbox", "tasks", "ask", "contracts"] as const;

const SHARE_IMAGES: Record<FeaturePageId, { url: string; width: number; height: number }> = {
  viewings: { url: "/marketing/agent-viewing.webp", width: 900, height: 900 },
  inbox: { url: "/marketing/agent-office.webp", width: 900, height: 900 },
  tasks: { url: "/marketing/agent-street.webp", width: 900, height: 900 },
  ask: { url: "/marketing/riverside-flat.webp", width: 1152, height: 864 },
  contracts: { url: "/marketing/agent-handover.webp", width: 900, height: 900 },
};

function isFeaturePage(page: string): page is FeaturePageId {
  return (PAGES as readonly string[]).includes(page);
}

export function generateStaticParams() {
  return PAGES.map((page) => ({ page }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  if (!isFeaturePage(page)) return {};
  const t = await getTranslations(`marketing.features.${page}`);
  return marketingMetadata({
    title: t("meta_title"),
    description: t("meta_description"),
    path: `/product/${page}`,
    image: SHARE_IMAGES[page],
  });
}

export default async function ProductFeaturePage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  if (!isFeaturePage(page)) notFound();
  return <FeaturePage page={page} />;
}
