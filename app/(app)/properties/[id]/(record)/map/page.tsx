import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { PropertyMap } from "@/components/properties/property-map";
import { withUserContext } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { formatAddress } from "@/lib/format";
import { ensurePipeline } from "@/lib/pipeline/ensure";
import {
  householdLabel,
  householdMemberLine,
  householdOf,
} from "@/lib/pipeline/household";
import { listApplications } from "@/lib/pipeline/queries";
import { listPeople } from "@/lib/properties/queries";

import { loadProperty } from "../../load";

export default async function PropertyMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, property } = await loadProperty(id);
  const t = await getTranslations("properties");
  const tMap = await getTranslations("properties.map");

  const { people, applicants, agent, stages } = await withUserContext(
    ctx.user.id,
    async (tx) => {
      const [people, applicants, pipeline] = await Promise.all([
        listPeople(tx, id),
        listApplications(tx, id),
        ensurePipeline(tx, id),
      ]);
      let agent: { fullName: string | null; avatarUrl: string | null } | null =
        null;
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
      return { people, applicants, agent, stages: pipeline.stages };
    },
  );

  const owners = people
    .filter((p) => p.relation === "owner")
    .map((p) => ({
      id: p.id,
      name: p.contact.fullName,
      subtitle: p.contact.email ?? p.contact.phone,
      href: `/properties/${id}/people`,
    }));
  const tenants = people
    .filter((p) => p.relation === "current_tenant")
    .map((p) => ({
      id: p.id,
      name: p.contact.fullName,
      subtitle: p.contact.email ?? p.contact.phone,
      href: `/properties/${id}/people`,
    }));

  const openStages = stages.filter((stage) => !stage.isTerminal);
  const households = applicants
    .filter((row) => !row.stage?.isTerminal)
    .map((row) => {
      const household = householdOf(
        row.contact.fullName,
        row.submission?.answers ?? null,
      );
      return {
        id: row.application.id,
        stageId: row.application.stageId,
        href: `/properties/${id}/applications`,
        title: householdLabel(household, {
          family: (name) => tMap("family", { name }),
          plus: (name, count) => tMap("plus", { name, count }),
        }),
        members: household.members,
        subtitle: household.size > 1 ? householdMemberLine(household) : null,
      };
    });

  const stagesForMap = openStages.map((stage) => ({
    id: stage.id,
    name: stage.name,
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-4">
      <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-muted/40 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:16px_16px]">
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
                  imageUrl: agent.avatarUrl,
                }
              : null
          }
          owners={owners}
          tenants={tenants}
          stages={stagesForMap}
          labels={{
            property: tMap("property"),
            agent: tMap("agent"),
            owner: t("people.relations.owner"),
            tenant: t("people.relations.current_tenant"),
            applicants: tMap("applicants"),
            empty_agent: tMap("empty_agent"),
            empty_owner: tMap("empty_owner"),
            empty_tenant: tMap("empty_tenant"),
          }}
        />
      </div>
    </div>
  );
}
