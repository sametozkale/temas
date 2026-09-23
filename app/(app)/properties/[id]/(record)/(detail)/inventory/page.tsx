import { InventorySection } from "@/components/properties/inventory-section";
import { withUserContext } from "@/lib/db";
import { can } from "@/lib/permissions";
import { listInventory } from "@/lib/properties/queries";

import { loadProperty } from "../../../load";

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx } = await loadProperty(id);
  const items = await withUserContext(ctx.user.id, (tx) =>
    listInventory(tx, id),
  );

  return (
    <InventorySection
      propertyId={id}
      items={items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        condition: i.condition,
        note: i.note,
      }))}
      canEdit={can(ctx.membership.role, "properties.write")}
    />
  );
}
