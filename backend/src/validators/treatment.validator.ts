import { z } from "zod";

export const createTreatmentSchema = z.object({
  body: z.object({
    label: z.string().min(1),
    default_duration_mins: z.number().int().positive(),
    buffer_after_mins: z.number().int().nonnegative().optional(),
    price: z.number().nonnegative(),
  }),
});

export const updateTreatmentSchema = z.object({
  body: z
    .object({
      label: z.string().min(1),
      default_duration_mins: z.number().int().positive(),
      buffer_after_mins: z.number().int().nonnegative(),
      price: z.number().nonnegative(),
      is_active: z.boolean(),
    })
    .partial(),
});
