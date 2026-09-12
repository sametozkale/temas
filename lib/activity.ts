import { db, type DbOrTx } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";

export type ActivityInput = {
  workspaceId: string;
  actorId?: string | null;
  propertyId?: string | null;
  /** dot-separated verb, e.g. "workspace.created", "member.invited" */
  action: string;
  entity?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown>;
};

/**
 * Append-only audit trail (docs/00 §8, docs/03 header). Never update or delete
 * rows from activity_log. Pass the surrounding transaction when available so
 * the log entry commits atomically with the change.
 */
export async function logActivity(input: ActivityInput, executor: DbOrTx = db) {
  await executor.insert(activityLog).values({
    workspaceId: input.workspaceId,
    actorId: input.actorId ?? null,
    propertyId: input.propertyId ?? null,
    action: input.action,
    entity: input.entity ?? null,
    entityId: input.entityId ?? null,
    data: input.data ?? {},
  });
}
