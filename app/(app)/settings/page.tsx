import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { AppearanceForm } from "@/components/settings/appearance-form";
import { SettingsPage } from "@/components/settings/settings-chrome";
import { getAppContext, initialsOf } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

import { ProfileForm } from "./general-forms";

export default async function SettingsProfilePage() {
  const t = await getTranslations("settings");
  const ctx = await getAppContext();
  const [profile] = await db
    .select({
      fullName: profiles.fullName,
      phone: profiles.phone,
      signature: profiles.aiSignature,
    })
    .from(profiles)
    .where(eq(profiles.id, ctx.user.id))
    .limit(1);

  return (
    <SettingsPage title={t("nav.profile")}>
      <ProfileForm
        fullName={profile?.fullName ?? ""}
        phone={profile?.phone ?? ""}
        signature={profile?.signature ?? ""}
        email={ctx.user.email ?? ""}
        avatarUrl={ctx.profile.avatarUrl}
        initials={initialsOf(profile?.fullName ?? ctx.user.email)}
      />
      <AppearanceForm />
    </SettingsPage>
  );
}
