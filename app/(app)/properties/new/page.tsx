import { PropertyCreateWizard } from "@/components/properties/property-create-wizard";
import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { requireAbility } from "@/lib/permissions";
import { listAssignableMembers } from "@/lib/properties/assignment";
import { EMPTY_PROPERTY_FORM } from "@/lib/properties/schema";
import { isValidTimezone } from "@/lib/timezones";

export default async function NewPropertyPage() {
  const ctx = await getAppContext();
  requireAbility(ctx.membership, "properties.write");

  const defaults = {
    ...EMPTY_PROPERTY_FORM,
    timezone: isValidTimezone(ctx.workspace.timezone)
      ? ctx.workspace.timezone
      : EMPTY_PROPERTY_FORM.timezone,
    assignedUserId: ctx.user.id,
  };

  const agents = await withUserContext(ctx.user.id, (tx) =>
    listAssignableMembers(tx, ctx.workspace.id),
  );

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col">
      <PropertyCreateWizard
        defaultValues={defaults}
        cancelHref="/properties"
        agents={agents.map((a) => ({
          userId: a.userId,
          name: a.fullName ?? a.userId,
        }))}
      />
    </div>
  );
}
