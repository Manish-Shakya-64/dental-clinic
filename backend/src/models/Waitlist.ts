import { Schema, model, Document, Types } from "mongoose";

export interface IWaitlist extends Document {
  _id: Types.ObjectId;
  patient: Types.ObjectId;
  reason: Types.ObjectId;
  preferred_practitioner?: Types.ObjectId | null;
  preferred_window_start?: Date;
  preferred_window_end?: Date;
  createdAt: Date;
}

const waitlistSchema = new Schema<IWaitlist>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    reason: { type: Schema.Types.ObjectId, ref: "Treatment", required: true },
    preferred_practitioner: { type: Schema.Types.ObjectId, ref: "Practitioner", default: null },
    preferred_window_start: { type: Date },
    preferred_window_end: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

waitlistSchema.index({ reason: 1, preferred_practitioner: 1, createdAt: 1 });

export const Waitlist = model<IWaitlist>("Waitlist", waitlistSchema);
