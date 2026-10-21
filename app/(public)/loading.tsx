import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Token pages (booking, forms, owner review) wait on the database before
 * any HTML for the page body. Show the shell skeleton immediately so a
 * slow connection does not look like a hung tab.
 */
export default async function PublicLoading() {
  const t = await getTranslations("common");

  return (
    <div
      className="mx-auto w-full max-w-xl space-y-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
