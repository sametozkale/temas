import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Calendar03Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PromptBar } from "@/components/prompt-bar";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-8">
      <PageHeader title={t("title")} description={t("description")} />
      <EmptyState
        icon={Calendar03Icon}
        title={t("empty_title")}
        description={t("empty_description")}
      />
      <div className="sticky bottom-6 mt-auto flex justify-center">
        <PromptBar placeholder={t("prompt_placeholder")} />
      </div>
    </div>
  );
}
