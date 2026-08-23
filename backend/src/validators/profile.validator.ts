import { z } from "zod";
import { workingHoursSchema, nameFieldsSchemaPartial, genderSchema } from "./common.js";

export const updateProfileSchema = z.object({
  body: z.object({
    ...nameFieldsSchemaPartial,
    gender: genderSchema.optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    specialties: z.array(z.string()).optional(),
    working_hours: workingHoursSchema.optional(),
  }),
});
