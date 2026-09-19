import { embed } from "ai";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { embeddings, properties } from "@/lib/db/schema";
import { embeddingModel } from "@/lib/ai/models";
import { formatAddress } from "@/lib/format";

export async function embedText(value: string) {
  const model = embeddingModel();
  if (!model) return null;
  const { embedding } = await embed({ model, value });
  return embedding;
}

export async function upsertEmbedding(input: {
  workspaceId: string;
  entity: string;
  entityId: string;
  chunk: string;
  meta?: Record<string, unknown>;
}) {
  const vector = await embedText(input.chunk);
  if (!vector) return { skipped: true as const };
  await db
    .delete(embeddings)
    .where(
      and(
        eq(embeddings.workspaceId, input.workspaceId),
        eq(embeddings.entity, input.entity),
        eq(embeddings.entityId, input.entityId),
      ),
    );
  await db.insert(embeddings).values({
    workspaceId: input.workspaceId,
    entity: input.entity,
    entityId: input.entityId,
    chunk: input.chunk,
    embedding: vector,
    meta: input.meta ?? {},
  });
  return { skipped: false as const };
}

export async function embedProperty(propertyId: string) {
  const [row] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);
  if (!row) return { skipped: true as const };
  const address = formatAddress(row.address) ?? "";
  const chunk = [
    row.title,
    row.type,
    row.status,
    address,
    row.rooms ? `${row.rooms} rooms` : "",
    row.bedrooms != null ? `${row.bedrooms} bedrooms` : "",
    row.bathrooms != null ? `${row.bathrooms} bathrooms` : "",
    row.floor != null
      ? row.totalFloors != null
        ? `floor ${row.floor} of ${row.totalFloors}`
        : `floor ${row.floor}`
      : "",
    row.yearBuilt ? `built ${row.yearBuilt}` : "",
    row.condition ? `condition ${row.condition}` : "",
    row.availableFrom ? `available from ${row.availableFrom}` : "",
    row.rentAmount ? `${row.rentAmount} ${row.currency}` : "",
    row.duesAmount ? `dues ${row.duesAmount} ${row.currency}` : "",
    row.description ?? "",
  ]
    .filter(Boolean)
    .join(". ");
  return upsertEmbedding({
    workspaceId: row.workspaceId,
    entity: "property",
    entityId: row.id,
    chunk,
    meta: { title: row.title },
  });
}
