import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PublicForm } from "@/components/pipeline/public-form";
import { db } from "@/lib/db";
import { formatAddress } from "@/lib/format";
import { getFormByPublicToken } from "@/lib/pipeline/queries";

export const revalidate = 60;

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("public_form");
  const found = await getFormByPublicToken(db, token);
  if (!found || !found.form.isPublished || found.property.deletedAt) {
    notFound();
  }
  const address = formatAddress(found.property.address);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header className="space-y-2 border-b pb-6">
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
          {t("kicker")}
        </p>
        <h1 className="font-serif text-xl font-medium tracking-tight">
          {found.form.title}
        </h1>
        <p className="text-sm text-muted-foreground">{found.property.title}</p>
        {address ? (
          <p className="text-sm text-muted-foreground">{address}</p>
        ) : null}
      </header>
      <PublicForm token={token} fields={found.form.schema} />
    </div>
  );
}
