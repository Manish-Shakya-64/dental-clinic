import { Schema, model, Document, Types } from "mongoose";

export interface ITreatment extends Document {
  _id: Types.ObjectId;
  label: string;
  default_duration_mins: number;
  buffer_after_mins: number;
  price: number;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const treatmentSchema = new Schema<ITreatment>(
  {
    label: { type: String, required: true },
    default_duration_mins: { type: Number, required: true },
    buffer_after_mins: { type: Number, default: 0 },
    price: { type: Number, required: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Treatment = model<ITreatment>("Treatment", treatmentSchema);
