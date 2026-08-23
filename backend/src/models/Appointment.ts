import { Schema, model, Document, Types } from "mongoose";
import { fieldEncryptionPlugin } from "../utils/fieldEncryptionPlugin.js";

export type AppointmentStatus =
  | "DRAFT"
  | "LOCK_EXPIRED"
  | "CONFIRMED"
  | "REMINDED"
  | "RECONFIRMED"
  | "CANCELLED"
  | "CHECKED_IN"
  | "WAITING"
  | "IN_CONSULT"
  | "COMPLETED"
  | "BILLED"
  | "CHECKED_OUT"
  | "RECALL_SCHEDULED"
  | "NO_SHOW";

/** Statuses excluded from the (practitioner, room, start_time) uniqueness constraint —
 *  slots freed by these statuses can be rebooked. */
export const NON_BLOCKING_STATUSES: AppointmentStatus[] = ["CANCELLED", "LOCK_EXPIRED", "NO_SHOW"];

export interface IClinicalNote {
  note_text: string;
  created_at: Date;
}

export interface IMedicine {
  name: string;
  dosage: string;
  instructions: string;
}

export interface IAppointment extends Document {
  _id: Types.ObjectId;
  appointment_code: string;
  patient: Types.ObjectId;
  practitioner: Types.ObjectId;
  room: Types.ObjectId;
  reason: Types.ObjectId;
  slot?: Types.ObjectId | null;
  start_time: Date;
  end_time: Date;
  status: AppointmentStatus;
  checked_in_by?: Types.ObjectId | null;
  clinical_note?: IClinicalNote;
  medicines: IMedicine[];
  lock_token?: string | null;
  lock_expires_at?: Date | null;
  /** Derived from `status` (see the pre('save') hook below) — true for every status except
   *  NON_BLOCKING_STATUSES. MongoDB partial-index filters only support $eq/$exists/$gt/$gte/$lt/$lte/
   *  $type/$and, not $nin, so the uniqueness constraint below is expressed against this flag instead
   *  of directly against `status`. */
  is_blocking_slot: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clinicalNoteSchema = new Schema<IClinicalNote>(
  {
    note_text: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const medicineSchema = new Schema<IMedicine>({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  instructions: { type: String, required: true },
});

const appointmentSchema = new Schema<IAppointment>(
  {
    appointment_code: { type: String, required: true, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    practitioner: { type: Schema.Types.ObjectId, ref: "Practitioner", required: true },
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    reason: { type: Schema.Types.ObjectId, ref: "Treatment", required: true },
    slot: { type: Schema.Types.ObjectId, ref: "Slot", default: null },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "LOCK_EXPIRED",
        "CONFIRMED",
        "REMINDED",
        "RECONFIRMED",
        "CANCELLED",
        "CHECKED_IN",
        "WAITING",
        "IN_CONSULT",
        "COMPLETED",
        "BILLED",
        "CHECKED_OUT",
        "RECALL_SCHEDULED",
        "NO_SHOW",
      ],
      required: true,
    },
    checked_in_by: { type: Schema.Types.ObjectId, ref: "StaffMember", default: null },
    clinical_note: { type: clinicalNoteSchema, default: undefined },
    medicines: { type: [medicineSchema], default: [] },
    lock_token: { type: String, default: null },
    lock_expires_at: { type: Date, default: null },
    is_blocking_slot: { type: Boolean, default: true },
  },
  { timestamps: true },
);

appointmentSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.is_blocking_slot = !NON_BLOCKING_STATUSES.includes(this.status);
  }
  next();
});

appointmentSchema.index(
  { practitioner: 1, room: 1, start_time: 1 },
  { unique: true, partialFilterExpression: { is_blocking_slot: { $eq: true } } },
);
appointmentSchema.index({ patient: 1, start_time: 1 });
appointmentSchema.index({ practitioner: 1, status: 1 });

appointmentSchema.plugin(fieldEncryptionPlugin, {
  fields: ["clinical_note.note_text"],
  arrayFields: [{ path: "medicines", fields: ["name", "dosage", "instructions"] }],
});

export const Appointment = model<IAppointment>("Appointment", appointmentSchema);
