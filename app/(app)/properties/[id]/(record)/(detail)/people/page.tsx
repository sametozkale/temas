import { PeopleSection } from "@/components/properties/people-section";
import { withUserContext } from "@/lib/db";
import { can } from "@/lib/permissions";
import {
  STAGE_APPROVED,
  STAGE_RENTED,
  STAGE_SHORTLISTED,
} from "@/lib/pipeline/defaults";
import { householdMemberLine, householdOf } from "@/lib/pipeline/household";
import { listApplications, listStages } from "@/lib/pipeline/queries";
import { listPeople } from "@/lib/properties/queries";

import { loadProperty } from "../../../load";

const STAGE_REJECTED = "Rejected";
const STAGE_CONTRACT = "Contract";
const PAST_SHORTLIST = new Set([
  STAGE_SHORTLISTED,
  STAGE_APPROVED,
  STAGE_CONTRACT,
  STAGE_RENTED,
  STAGE_REJECTED,
]);

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx } = await loadProperty(id);
  const [people, applications, stages] = await withUserContext(
    ctx.user.id,
    async (tx) =>
      Promise.all([
        listPeople(tx, id),
        listApplications(tx, id),
        listStages(tx, id),
      ]),
  );

  const tenantIds = new Set(
    people
      .filter((person) => person.relation === "current_tenant")
      .map((person) => person.contact.id),
  );

  return (
    <PeopleSection
      propertyId={id}
      canEdit={can(ctx.membership.role, "properties.write")}
      canManagePipeline={can(ctx.membership.role, "pipeline.manage")}
      shortlistStageId={
        stages.find((stage) => stage.name === STAGE_SHORTLISTED)?.id ?? null
      }
      rejectStageId={
        stages.find((stage) => stage.name === STAGE_REJECTED)?.id ?? null
      }
      people={people.map((p) => ({
        id: p.id,
        relation: p.relation,
        inviteToken: p.inviteToken,
        inviteExpiresAt: p.inviteExpiresAt?.toISOString() ?? null,
        joinedAt: p.joinedAt?.toISOString() ?? null,
        contact: {
          fullName: p.contact.fullName,
          email: p.contact.email,
          phone: p.contact.phone,
          userId: p.contact.userId,
        },
      }))}
      prospects={applications
        .filter((row) => !tenantIds.has(row.contact.id))
        .map((row) => {
          const answers = row.submission?.answers ?? {};
          const household = householdOf(row.contact.fullName, answers);
          const stageName = row.stage?.name ?? null;
          return {
            applicationId: row.application.id,
            stageName,
            score: row.application.score,
            memberLine:
              household.size > 1 ? householdMemberLine(household) : null,
            canShortlist: stageName != null && !PAST_SHORTLIST.has(stageName),
            canReject:
              stageName !== STAGE_REJECTED && stageName !== STAGE_RENTED,
            canMakeTenant:
              stageName !== STAGE_REJECTED &&
              Boolean(row.contact.email || row.contact.phone),
            contact: {
              fullName: row.contact.fullName,
              email: row.contact.email,
              phone: row.contact.phone,
            },
          };
        })}
    />
  );
}

