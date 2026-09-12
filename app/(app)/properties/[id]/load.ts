import { notFound } from "next/navigation";
import { cache } from "react";

import { getAppContext } from "@/lib/auth";
import { withUserContext } from "@/lib/db";
import { getProperty } from "@/lib/properties/queries";
import { uuidSchema } from "@/lib/properties/schema";

/**
 * Property for the detail layout + tab pages. Cached per request so the
 * layout and the active tab share one query. 404s on unknown / foreign ids.
 */
export const loadProperty = cache(async (id: string) => {
  if (!uuidSchema.safeParse(id).success) notFound();
  const ctx = await getAppContext();
  const property = await withUserContext(ctx.user.id, (tx) =>
    getProperty(tx, ctx.workspace.id, id),
  );
  if (!property) notFound();
  return { ctx, property };
});
