import { PeopleSection } from "@/components/properties/people-section";
import { withUserContext } from "@/lib/db";
import { can } from "@/lib/permissions";
import { listPeople } from "@/lib/properties/queries";

import { loadProperty } from "../../../load";

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx } = await loadProperty(id);
  const people = await withUserContext(ctx.user.id, (tx) => listPeople(tx, id));

  return (
    <PeopleSection
      propertyId={id}
      canEdit={can(ctx.membership.role, "properties.write")}
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
    />
  );
}
