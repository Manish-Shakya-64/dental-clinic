import { z } from "zod";
import { objectId } from "./common.js";

export const createSlotSchema = z.object({
  body: z
    .object({
      practitionerId: objectId,
      roomId: objectId,
      startTime: z.coerce.date(),
      endTime: z.coerce.date(),
      /** When set, creates this same slot again N-1 more times, 7 days apart. */
      repeatWeeks: z.coerce.number().int().min(1).max(52).optional(),
    })
    .refine((body) => body.endTime > body.startTime, {
      message: "End time must be after start time",
      path: ["endTime"],
    }),
});

export const updateSlotSchema = z.object({
  body: z
    .object({
      startTime: z.coerce.date().optional(),
      endTime: z.coerce.date().optional(),
      status: z.enum(["OPEN", "BOOKED", "BLOCKED"]).optional(),
    })
    // Only checkable when the request sends both — a partial edit is validated against the slot's
    // stored counterpart in the controller instead.
    .refine((body) => !body.startTime || !body.endTime || body.endTime > body.startTime, {
      message: "End time must be after start time",
      path: ["endTime"],
    }),
});

export const listSlotsSchema = z.object({
  query: z.object({
    practitioner: objectId.optional(),
    status: z.enum(["OPEN", "BOOKED", "BLOCKED"]).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});
