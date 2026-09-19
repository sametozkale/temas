import { z } from "zod";

import { uuidSchema } from "@/lib/properties/schema";

export const threadTitleSchema = z.string().trim().min(1).max(60);

export const renameThreadSchema = z.object({
  threadId: uuidSchema,
  title: threadTitleSchema,
});
