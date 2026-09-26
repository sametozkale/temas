import { z } from "zod";

import { FORM_FIELD_TYPES } from "./defaults";

export const formFieldSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(1).max(120),
  type: z.enum(FORM_FIELD_TYPES),
  required: z.boolean().optional(),
  hidden: z.boolean().optional(),
  options: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  helpText: z.string().trim().max(240).optional(),
});

export const formSchemaInput = z
  .object({
    title: z.string().trim().min(2).max(120),
    schema: z.array(formFieldSchema).min(1).max(40),
    isPublished: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const keys = new Set<string>();
    value.schema.forEach((field, index) => {
      if (keys.has(field.key)) {
        ctx.addIssue({
          code: "custom",
          message: "duplicate_key",
          path: ["schema", index, "key"],
        });
      }
      keys.add(field.key);
      if (
        (field.type === "select" || field.type === "multiselect") &&
        (!field.options || field.options.length < 2)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "options",
          path: ["schema", index, "options"],
        });
      }
    });
  });

export const stageInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .enum(["muted", "info", "brand", "warning", "success", "destructive"])
    .optional()
    .nullable(),
  isTerminal: z.boolean().optional(),
});

export const identitySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => z.email().safeParse(v).success, "email"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/[^\d+]/g, "") : null))
    .refine((v) => v === null || /^\+?\d{7,15}$/.test(v), "phone"),
});

export const ownerDecisionSchema = z.object({
  decision: z.enum(["approve", "request_changes"]),
  applicationId: z.string().uuid(),
});
