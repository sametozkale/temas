import { getTranslations } from "next-intl/server";

export default async function PublicBookingNotFound() {
  const t = await getTranslations("booking");
  return (
    <div className="space-y-2 py-16 text-center">
      <h1 className="font-serif text-2xl tracking-tight">
        {t("not_found_title")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("not_found_description")}
      </p>
    </div>
  );
}
