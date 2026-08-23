import { Schema, model, Document, Types } from "mongoose";

export type SlotStatus = "OPEN" | "BOOKED" | "BLOCKED";

export interface ISlot extends Document {
  _id: Types.ObjectId;
  practitioner: Types.ObjectId;
  room: Types.ObjectId;
  start_time: Date;
  end_time: Date;
  status: SlotStatus;
  created_by: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const slotSchema = new Schema<ISlot>(
  {
    practitioner: { type: Schema.Types.ObjectId, ref: "Practitioner", required: true },
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    status: { type: String, enum: ["OPEN", "BOOKED", "BLOCKED"], default: "OPEN" },
    created_by: { type: Schema.Types.ObjectId, ref: "StaffMember", required: true },
  },
  { timestamps: true },
);

slotSchema.index({ practitioner: 1, start_time: 1 });

export const Slot = model<ISlot>("Slot", slotSchema);
