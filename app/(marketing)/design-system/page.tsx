import type { Metadata } from "next";

import { UiKitCatalog } from "@/components/ui-kit/ui-kit-catalog";

export const metadata: Metadata = {
  title: "Design system",
  description: "Temas colors, typography, and shared interface components.",
};

export default function DesignSystemPage() {
  return <UiKitCatalog />;
}
