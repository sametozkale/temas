import { eq } from "drizzle-orm";

import { getAppContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { can } from "@/lib/permissions";

import { ProfileForm, WorkspaceForm } from "./general-forms";

export default async function SettingsGeneralPage() {
  const ctx = await getAppContext();
  const [profile] = await db
    .select({ fullName: profiles.fullName, phone: profiles.phone })
    .from(profiles)
    .where(eq(profiles.id, ctx.user.id))
    .limit(1);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <WorkspaceForm
        name={ctx.workspace.name}
        timezone={ctx.workspace.timezone}
        canEdit={can(ctx.membership.role, "workspace.update")}
      />
      <ProfileForm
        fullName={profile?.fullName ?? ""}
        phone={profile?.phone ?? ""}
        email={ctx.user.email ?? ""}
      />
    </div>
  );
}
