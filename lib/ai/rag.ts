import { cosineDistance, and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { embeddings } from "@/lib/db/schema";
import { embedText } from "@/lib/ai/embed";

export async function searchSnippets(
  workspaceId: string,
  query: string,
  limit = 6,
) {
  const vector = await embedText(query);
  if (!vector) return [];
  const distance = cosineDistance(embeddings.embedding, vector);
  return db
    .select({
      entity: embeddings.entity,
      entityId: embeddings.entityId,
      chunk: embeddings.chunk,
      distance,
    })
    .from(embeddings)
    .where(
      and(eq(embeddings.workspaceId, workspaceId), sql`${distance} < 0.25`),
    )
    .orderBy(distance)
    .limit(limit);
}
