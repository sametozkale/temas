import { eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import {
  PropertyMap,
  type MapShare,
} from "@/components/properties/property-map";
import { publicAppUrl } from "@/lib/app-url";
import { portraitFromEmail } from "@/lib/identity/portrait";
import { db, withUserContext } from "@/lib/db";
import { authUsers, profiles } from "@/lib/db/schema";
import { formatAddress } from "@/lib/format";
import { can } from "@/lib/permissions";
import { ensurePipeline } from "@/lib/pipeline/ensure";
import {
  householdLabel,
  householdMemberLine,
  householdOf,
} from "@/lib/pipeline/household";
import { listApplications } from "@/lib/pipeline/queries";
import { listPeople } from "@/lib/properties/queries";
import { avatarPublicUrl } from "@/lib/storage-constants";
import { getCalendarByProperty } from "@/lib/viewings/queries";

import { loadProperty } from "../../load";

/** Address of the assigned agent, used only to look up a public portrait. */
async function agentAddress(
  userId: string | null,
  viewer: { id: string; email: string | null },
) {
  if (!userId) return null;
  if (userId === viewer.id) return viewer.email;
  const [row] = await db
    .select({ email: authUsers.email })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);
  return row?.email ?? null;
}

export default async function PropertyMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, property } = await loadProperty(id);
  const t = await getTranslations("properties");
  const tMap = await getTranslations("properties.map");
  const tShare = await getTranslations("properties.map.share");

  const [
    { people, applicants, agent, uploaded, stages, form, ownerView, calendar },
    agentEmail,
    origin,
  ] = await Promise.all([
    withUserContext(ctx.user.id, async (tx) => {
      const [people, applicants, pipeline, calendar] = await Promise.all([
        listPeople(tx, id),
        listApplications(tx, id),
        ensurePipeline(tx, id),
        getCalendarByProperty(tx, id),
      ]);
      let agent: {
        fullName: string | null;
        avatarUrl: string | null;
      } | null = null;
      if (property.assignedUserId) {
        const [row] = await tx
          .select({
            fullName: profiles.fullName,
            avatarUrl: profiles.avatarUrl,
          })
          .from(profiles)
          .where(eq(profiles.id, property.assignedUserId))
          .limit(1);
        agent = row ?? { fullName: null, avatarUrl: null };
      }
      const linkedIds = [
        ...new Set(
          people.flatMap((person) =>
            person.contact.userId ? [person.contact.userId] : [],
          ),
        ),
      ];
      const uploaded = linkedIds.length
        ? await tx
            .select({
              id: profiles.id,
              avatarUrl: profiles.avatarUrl,
            })
            .from(profiles)
            .where(inArray(profiles.id, linkedIds))
        : [];
      return {
        people,
        applicants,
        agent,
        uploaded,
        stages: pipeline.stages,
        form: pipeline.form,
        ownerView: pipeline.ownerView,
        calendar,
      };
    }),
    agentAddress(property.assignedUserId, ctx.user),
    publicAppUrl(),
  ]);

  const uploadedByUser = new Map(
    uploaded.map((row) => [row.id, row.avatarUrl]),
  );
  const imageFor = (email: string | null | undefined, userId?: string | null) =>
    avatarPublicUrl(userId ? uploadedByUser.get(userId) : null) ??
    portraitFromEmail(email);

  const owners = people
    .filter((p) => p.relation === "owner")
    .map((p) => ({
      id: p.id,
      name: p.contact.fullName,
      subtitle: p.contact.email ?? p.contact.phone,
      href: `/properties/${id}/people`,
      imageUrl: imageFor(p.contact.email, p.contact.userId),
    }));
  const tenants = people
    .filter((p) => p.relation === "current_tenant")
    .map((p) => ({
      id: p.id,
      name: p.contact.fullName,
      subtitle: p.contact.email ?? p.contact.phone,
      href: `/properties/${id}/people`,
      imageUrl: imageFor(p.contact.email, p.contact.userId),
    }));

  const role = ctx.membership.role;
  const now = Date.now();
  const link = (path: string) => new URL(path, origin).toString();
  const denied: MapShare = { url: null, hint: tShare("no_permission") };

  const inviteShare = (
    relation: "owner" | "current_tenant",
    onHint: string,
    noneHint: string,
  ): MapShare => {
    if (!can(role, "properties.write")) return denied;
    const linked = people.filter((p) => p.relation === relation);
    if (linked.length === 0) return { url: null, hint: noneHint };
    const open = linked.find(
      (p) =>
        p.inviteToken &&
        !p.joinedAt &&
        (!p.inviteExpiresAt || p.inviteExpiresAt.getTime() > now),
    );
    if (open?.inviteToken) {
      return { url: link(`/p/${open.inviteToken}`), hint: onHint };
    }
    const joined = linked.find((p) => p.joinedAt);
    if (joined) {
      return {
        url: null,
        hint: tShare("invite_joined", { name: joined.contact.fullName }),
      };
    }
    return { url: null, hint: tShare("invite_off") };
  };

  const ownerReviewLive =
    !ownerView.expiresAt || ownerView.expiresAt.getTime() > now;
  const shares = {
    ownerReview: !can(role, "pipeline.manage")
      ? denied
      : ownerReviewLive
        ? {
            url: link(`/o/${ownerView.publicToken}`),
            hint: tShare("owner_review_on"),
          }
        : { url: null, hint: tShare("owner_review_off") },
    ownerInvite: inviteShare(
      "owner",
      tShare("owner_invite_on"),
      tShare("owner_none"),
    ),
    tenantInvite: inviteShare(
      "current_tenant",
      tShare("tenant_invite_on"),
      tShare("tenant_none"),
    ),
    form: !can(role, "pipeline.manage")
      ? denied
      : form.isPublished && form.publicToken
        ? { url: link(`/f/${form.publicToken}`), hint: tShare("form_on") }
        : { url: null, hint: tShare("form_off") },
    booking: !can(role, "calendar.manage")
      ? denied
      : calendar?.isPublished
        ? {
            url: link(`/b/${calendar.publicToken}`),
            hint: tShare("booking_on"),
          }
        : { url: null, hint: tShare("booking_off") },
  };

  const openStages = stages.filter((stage) => !stage.isTerminal);
  const households = applicants
    .filter((row) => !row.stage?.isTerminal)
    .map((row) => {
      const household = householdOf(
        row.contact.fullName,
        row.submission?.answers ?? null,
        row.contact.email,
      );
      return {
        id: row.application.id,
        stageId: row.application.stageId,
        href: `/properties/${id}/pipeline`,
        title: householdLabel(household, {
          family: (name) => tMap("family", { name }),
          plus: (name, count) => tMap("plus", { name, count }),
        }),
        members: household.members.map((member) => ({
          name: member.name,
          unnamed: member.unnamed,
          imageUrl: member.unnamed ? null : portraitFromEmail(member.email),
        })),
        subtitle: household.size > 1 ? householdMemberLine(household) : null,
        score: row.application.score,
      };
    });

  const stagesForMap = openStages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    households: households.filter((row) => row.stageId === stage.id),
  }));
  const unstaged = households.filter(
    (row) => !row.stageId || !openStages.some((s) => s.id === row.stageId),
  );
  if (unstaged.length > 0 && stagesForMap[0]) {
    stagesForMap[0] = {
      ...stagesForMap[0],
      households: [...unstaged, ...stagesForMap[0].households],
    };
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
      <PropertyMap
        property={{
          id: property.id,
          title: property.title,
          type: property.type,
          href: `/properties/${id}/overview`,
          address: formatAddress(property.address, { short: true }),
        }}
        agent={
          agent
            ? {
                id: property.assignedUserId ?? "agent",
                name: agent.fullName?.trim() || tMap("empty_agent"),
                subtitle: null,
                imageUrl:
                  avatarPublicUrl(agent.avatarUrl) ??
                  portraitFromEmail(agentEmail),
              }
            : null
        }
        owners={owners}
        tenants={tenants}
        stages={stagesForMap}
        shares={shares}
        labels={{
          property: tMap("property"),
          agent: tMap("agent"),
          owner: t("people.relations.owner"),
          tenant: t("people.relations.current_tenant"),
          applicants: tMap("applicants"),
          empty_agent: tMap("empty_agent"),
          empty_owner: tMap("empty_owner"),
          empty_tenant: tMap("empty_tenant"),
          owner_review: tShare("owner_review"),
          owner_invite: tShare("owner_invite"),
          tenant_invite: tShare("tenant_invite"),
          form: tShare("form"),
          booking: tShare("booking"),
          applicant_links: tShare("applicant_links"),
          owner_links: tShare("owner_links"),
          tenant_links: tShare("tenant_links"),
          copied: tShare("copied"),
          zoom_in: tMap("zoom_in"),
          zoom_out: tMap("zoom_out"),
          zoom_reset: tMap("zoom_reset"),
          fit: tMap("fit"),
          canvas_hint: tMap("canvas_hint"),
        }}
      />
    </div>
  );
}
