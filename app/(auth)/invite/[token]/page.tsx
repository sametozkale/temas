import { and, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { signOutTo } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { invites, profiles, workspaces } from "@/lib/db/schema";

import { AcceptInviteForm } from "./accept-form";

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const t = await getTranslations("invite");
  const tr = await getTranslations("roles");

  const [invite] = await db
    .select({
      id: invites.id,
      email: invites.email,
      role: invites.role,
      expiresAt: invites.expiresAt,
      workspaceName: workspaces.name,
    })
    .from(invites)
    .innerJoin(workspaces, eq(workspaces.id, invites.workspaceId))
    .where(and(eq(invites.token, token), isNull(invites.acceptedAt)))
    .limit(1);

  if (!invite || invite.expiresAt < new Date()) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-4xl leading-[1.05] font-normal tracking-tight">
          {t("invalid_title")}
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {t("invalid_description")}
        </p>
      </div>
    );
  }

  const user = await getUser();
  const loginHref = `/login?next=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite.email)}`;

  let needsName = true;
  if (user) {
    const [profile] = await db
      .select({ fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    needsName = !profile?.fullName;
  }

  const mismatch =
    user && user.email?.toLowerCase() !== invite.email.toLowerCase();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="font-serif text-4xl leading-[1.05] font-normal tracking-tight">
          {t("title", { workspace: invite.workspaceName })}
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {t("description", { role: tr(invite.role), email: invite.email })}
        </p>
      </div>

      {!user ? (
        <Button asChild className="w-full">
          <Link href={loginHref}>{t("sign_in_to_accept")}</Link>
        </Button>
      ) : mismatch ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">
            {t("errors.email_mismatch")}
          </p>
          <form action={signOutTo}>
            <input type="hidden" name="next" value={loginHref} />
            <Button type="submit" variant="outline" className="w-full">
              {t("switch_account")}
            </Button>
          </form>
        </div>
      ) : (
        <AcceptInviteForm token={token} needsName={needsName} />
      )}
    </div>
  );
}
