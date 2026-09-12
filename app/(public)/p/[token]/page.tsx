import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { TenantWizard } from "@/components/viewings/tenant-wizard";
import { db } from "@/lib/db";
import { parseTimeToMinutes } from "@/lib/slots";
import {
  getCalendarByProperty,
  getInviteByToken,
  listWindows,
} from "@/lib/viewings/queries";
import { emptyWeek, weekdayFromRRule } from "@/lib/viewings/week";

export default async function TenantInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("tenant");
  const invite = await getInviteByToken(db, token);
  if (!invite || invite.property.deletedAt) notFound();

  const calendar = await getCalendarByProperty(db, invite.property.id);
  const week = emptyWeek();
  if (calendar) {
    const kind =
      invite.person.relation === "owner" ? "owner" : "current_tenant";
    const windows = (await listWindows(db, calendar.id)).filter(
      (w) => w.participantKind === kind && w.contactId === invite.contact.id,
    );
    for (const w of windows) {
      const day = weekdayFromRRule(w.rrule);
      if (!day) continue;
      const cell = week.find((c) => c.weekday === day);
      if (!cell) continue;
      cell.enabled = true;
      cell.startMin = parseTimeToMinutes(w.startTime);
      cell.endMin = parseTimeToMinutes(w.endTime);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header className="space-y-2 border-b pb-6">
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
          {t("kicker")}
        </p>
        <h1 className="font-serif text-3xl tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("description", {
            name: invite.contact.fullName,
            property: invite.property.title,
          })}
        </p>
      </header>
      <TenantWizard token={token} week={week} />
    </div>
  );
}
