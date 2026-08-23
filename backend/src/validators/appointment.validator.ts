import { z } from "zod";
import { objectId } from "./common.js";

export const createAppointmentSchema = z.object({
  body: z.object({
    patientId: objectId.optional(),
    practitionerId: objectId,
    roomId: objectId,
    treatmentId: objectId,
    startTime: z.coerce.date(),
    slotId: objectId.optional(),
  }),
});

export const patchAppointmentSchema = z.object({
  body: z.discriminatedUnion("action", [
    z.object({
      action: z.literal("reschedule"),
      startTime: z.coerce.date(),
      practitionerId: objectId.optional(),
      roomId: objectId.optional(),
      slotId: objectId.optional(),
    }),
    z.object({ action: z.literal("cancel") }),
    z.object({ action: z.literal("check-in") }),
    z.object({ action: z.literal("complete") }),
    z.object({ action: z.literal("no-show") }),
  ]),
});

export const listAppointmentsSchema = z.object({
  query: z.object({
    code: z.string().optional(),
    patient: objectId.optional(),
    practitioner: objectId.optional(),
    status: z.string().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const addNoteSchema = z.object({
  body: z.object({ noteText: z.string().min(1) }),
});

export const addMedicineSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    instructions: z.string().min(1),
  }),
});
