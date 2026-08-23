import { z } from "zod";
import { workingHoursSchema, nameFieldsSchema, nameFieldsSchemaPartial, genderSchema } from "./common.js";

export const createStaffSchema = z.object({
  body: z.object({
    ...nameFieldsSchema,
    gender: genderSchema,
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().optional(),
    role: z.enum(["RECEPTIONIST", "ADMIN", "DOCTOR"]),
    specialties: z.array(z.string()).optional(),
    working_hours: workingHoursSchema.optional(),
  }),
});

export const updateStaffSchema = z.object({
  body: z.object({
    ...nameFieldsSchemaPartial,
    gender: genderSchema.optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    specialties: z.array(z.string()).optional(),
    working_hours: workingHoursSchema.optional(),
    is_active: z.boolean().optional(),
  }),
});

export const listStaffSchema = z.object({
  query: z.object({
    role: z.enum(["DOCTOR", "RECEPTIONIST", "ADMIN"]).optional(),
    is_active: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(20),
  }),
});
