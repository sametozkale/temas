import { z } from "zod";

export const inboundInjectSchema = z.object({
  fromName: z.string().trim().min(2).max(120),
  fromEmail: z.string().trim().toLowerCase().email(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
});

export const replySchema = z.object({
  body: z.string().trim().min(1).max(8000),
});
