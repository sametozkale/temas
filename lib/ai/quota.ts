import { and, eq, gte, sql } from "drizzle-orm";

import { creditCost } from "@/lib/ai/credits";
import { monthRange } from "@/lib/ai/intent";
import type { DbOrTx } from "@/lib/db";
import { aiMessages, aiThreads, workspaces } from "@/lib/db/schema";
import { getPlan, parseBillingInterval, parsePlanId, planCredits } from "@/lib/plans";

export async function getQuota(
  tx: DbOrTx,
  workspaceId: string,
  timeZone: string,
) {
  const [ws] = await tx
    .select({
      plan: workspaces.plan,
      billingInterval: workspaces.billingInterval,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const plan = parsePlanId(ws?.plan);
  const interval = parseBillingInterval(ws?.billingInterval);
  const limit = planCredits(getPlan(plan), interval);
  const { start, end } = monthRange(timeZone);
  const [row] = await tx
    .select({
      used: sql<number>`coalesce(sum(${aiMessages.credits}), 0)`,
    })
    .from(aiMessages)
    .innerJoin(aiThreads, eq(aiThreads.id, aiMessages.threadId))
    .where(
      and(
        eq(aiThreads.workspaceId, workspaceId),
        gte(aiMessages.createdAt, start),
      ),
    );
  const used = Number(row?.used ?? 0);
  const ask = creditCost("ask");
  return {
    plan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    exhausted: used + ask > limit,
    resetsAt: end,
  };
}
