import { z } from "zod";
import { nameFieldsSchema, nameFieldsSchemaPartial, genderSchema } from "./common.js";

export const createPatientSchema = z.object({
  body: z.object({
    ...nameFieldsSchema,
    gender: genderSchema,
    email: z.string().email(),
    phone: z.string().min(7),
    dob: z.coerce.date(),
    address: z.string().optional(),
    medical_history: z.string().optional(),
  }),
});

export const updatePatientSchema = z.object({
  body: z.object({
    ...nameFieldsSchemaPartial,
    gender: genderSchema.optional(),
    email: z.string().email().optional(),
    phone: z.string().min(7).optional(),
    address: z.string().optional(),
    medical_history: z.string().optional(),
  }),
});

export const listPatientsSchema = z.object({
  query: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});
