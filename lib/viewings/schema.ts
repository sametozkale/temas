import { z } from "zod";

import { WEEKDAYS } from "./week";

export const calendarSettingsSchema = z.object({
  slotDurationMin: z.coerce.number().int().min(15).max(180),
  bufferMin: z.coerce.number().int().min(0).max(120),
  minNoticeHours: z.coerce.number().int().min(0).max(72),
  maxDaysAhead: z.coerce.number().int().min(1).max(90),
  isPublished: z.boolean().optional(),
});

export const weekCellSchema = z.object({
  weekday: z.enum(WEEKDAYS),
  enabled: z.boolean(),
  startMin: z.coerce
    .number()
    .int()
    .min(0)
    .max(24 * 60 - 1),
  endMin: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 60),
});

export const weekSchema = z
  .array(weekCellSchema)
  .length(7)
  .superRefine((cells, ctx) => {
    for (const cell of cells) {
      if (cell.enabled && cell.endMin <= cell.startMin) {
        ctx.addIssue({
          code: "custom",
          message: "end_before_start",
          path: [cell.weekday],
        });
      }
    }
  });

export const bookingProspectSchema = z.object({
  slotId: z.string().uuid(),
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

export const otpSchema = z.object({
  otpId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});
