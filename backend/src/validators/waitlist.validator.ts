import { z } from "zod";
import { objectId } from "./common.js";

export const joinWaitlistSchema = z.object({
  body: z.object({
    patientId: objectId.optional(),
    treatmentId: objectId,
    preferredPractitionerId: objectId.optional(),
    preferredWindowStart: z.coerce.date().optional(),
    preferredWindowEnd: z.coerce.date().optional(),
  }),
});

export const offerSlotSchema = z.object({
  body: z.object({
    slotId: objectId,
  }),
});
