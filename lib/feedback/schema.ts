import { z } from "zod";

export const feedbackSchema = z.object({
  body: z.string().trim().min(8).max(4000),
  path: z.string().trim().max(200).optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
