import { Schema, model, Document, Types } from "mongoose";

export type RecallStatus = "PENDING" | "REMINDER_SENT" | "BOOKED";

export interface IRecall extends Document {
  _id: Types.ObjectId;
  patient: Types.ObjectId;
  original_appointment: Types.ObjectId;
  due_date: Date;
  status: RecallStatus;
}

const recallSchema = new Schema<IRecall>({
  patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  original_appointment: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
  due_date: { type: Date, required: true },
  status: { type: String, enum: ["PENDING", "REMINDER_SENT", "BOOKED"], default: "PENDING" },
});

recallSchema.index({ status: 1, due_date: 1 });

export const Recall = model<IRecall>("Recall", recallSchema);
