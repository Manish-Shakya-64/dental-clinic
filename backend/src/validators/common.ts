import { z } from "zod";
import { GENDERS } from "../types/person.types.js";

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const genderSchema = z.enum(GENDERS as [string, ...string[]]);

/** First name is the only mandatory name part; middle/last are both optional. */
export const nameFieldsSchema = {
  first_name: z.string().min(1),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
};

export const nameFieldsSchemaPartial = {
  first_name: z.string().min(1).optional(),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
};

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const workingHoursBlock = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:mm"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:mm"),
});

export const workingHoursSchema = z
  .object({
    mon: z.array(workingHoursBlock).optional(),
    tue: z.array(workingHoursBlock).optional(),
    wed: z.array(workingHoursBlock).optional(),
    thu: z.array(workingHoursBlock).optional(),
    fri: z.array(workingHoursBlock).optional(),
    sat: z.array(workingHoursBlock).optional(),
    sun: z.array(workingHoursBlock).optional(),
  })
  .strict();
