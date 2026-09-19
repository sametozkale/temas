import { and, count, eq, gte } from "drizzle-orm";

import type { DbOrTx } from "@/lib/db";
import { aiMessages, aiThreads, workspaces } from "@/lib/db/schema";
import { monthRange } from "@/lib/ai/intent";
import { getPlan, parsePlanId } from "@/lib/plans";

export async function getQuota(
  tx: DbOrTx,
  workspaceId: string,
  timeZone: string,
) {
  const [ws] = await tx
    .select({ plan: workspaces.plan })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const plan = parsePlanId(ws?.plan);
  const limit = getPlan(plan).aiMessagesPerMonth;
  const { start, end } = monthRange(timeZone);
  const [row] = await tx
    .select({ used: count() })
    .from(aiMessages)
    .innerJoin(aiThreads, eq(aiThreads.id, aiMessages.threadId))
    .where(
      and(
        eq(aiThreads.workspaceId, workspaceId),
        eq(aiMessages.role, "user"),
        gte(aiMessages.createdAt, start),
      ),
    );
  const used = Number(row?.used ?? 0);
  return {
    plan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    exhausted: used >= limit,
    resetsAt: end,
  };
}
