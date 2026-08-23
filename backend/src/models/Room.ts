import { Schema, model, Document, Types } from "mongoose";

export type RoomStatus = "AVAILABLE" | "SANITIZING" | "OCCUPIED";

export interface IRoom extends Document {
  _id: Types.ObjectId;
  name: string;
  equipment_tags: string[];
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    name: { type: String, required: true },
    equipment_tags: [{ type: String }],
    status: { type: String, enum: ["AVAILABLE", "SANITIZING", "OCCUPIED"], default: "AVAILABLE" },
  },
  { timestamps: true },
);

export const Room = model<IRoom>("Room", roomSchema);
