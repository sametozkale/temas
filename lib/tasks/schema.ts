import { z } from "zod";

import { TASK_PRIORITIES, type TaskPriority } from "@/lib/db/schema/tasks";
import { uuidSchema } from "@/lib/properties/schema";

export const NONE_PROPERTY = "none";

export const taskWriteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  propertyId: z
    .union([z.literal(""), z.literal(NONE_PROPERTY), uuidSchema])
    .optional(),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  assigneeId: uuidSchema,
});

export const taskPatchSchema = z
  .object({
    id: uuidSchema,
    title: z.string().trim().min(1).max(200).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    assigneeId: uuidSchema.optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.priority !== undefined ||
      value.assigneeId !== undefined,
  );

export function optionalPropertyId(value: string | undefined): string | null {
  if (!value || value === NONE_PROPERTY) return null;
  return value;
}

export { TASK_PRIORITIES, type TaskPriority };
