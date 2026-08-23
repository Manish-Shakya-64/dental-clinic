import { Schema, model, Document, Types } from "mongoose";

export interface IBill extends Document {
  _id: Types.ObjectId;
  bill_number: string;
  appointment: Types.ObjectId;
  patient: Types.ObjectId;
  treatment: Types.ObjectId;
  /** Snapshot of Treatment.price at the moment of billing — later price changes never alter this. */
  amount: number;
  issued_by: Types.ObjectId;
  issued_at: Date;
  printed_at?: Date | null;
  emailed_at?: Date | null;
}

const billSchema = new Schema<IBill>({
  bill_number: { type: String, required: true, unique: true },
  appointment: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
  patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  treatment: { type: Schema.Types.ObjectId, ref: "Treatment", required: true },
  amount: { type: Number, required: true },
  issued_by: { type: Schema.Types.ObjectId, ref: "StaffMember", required: true },
  issued_at: { type: Date, required: true, default: Date.now },
  printed_at: { type: Date, default: null },
  emailed_at: { type: Date, default: null },
});

export const Bill = model<IBill>("Bill", billSchema);
