import { Schema, model, Document, Types } from "mongoose";
import { Gender } from "../types/person.types.js";

export interface IWorkingHoursBlock {
  start: string;
  end: string;
}

export type WorkingHours = Partial<
  Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", IWorkingHoursBlock[]>
>;

export interface IPractitioner extends Document {
  _id: Types.ObjectId;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  gender: Gender;
  /** Contact/display email — distinct from User.email, which is the login identity. */
  email?: string;
  phone?: string;
  specialties: string[];
  working_hours: WorkingHours;
  is_active: boolean;
  /** Generated filename under uploads/profile-images/, never the client-supplied name. */
  profile_image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const practitionerSchema = new Schema<IPractitioner>(
  {
    first_name: { type: String, required: true },
    middle_name: { type: String },
    last_name: { type: String },
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], required: true },
    email: { type: String },
    phone: { type: String },
    specialties: [{ type: String }],
    working_hours: { type: Schema.Types.Mixed, default: {} },
    is_active: { type: Boolean, default: true },
    profile_image: { type: String, default: null },
  },
  { timestamps: true },
);

export const Practitioner = model<IPractitioner>("Practitioner", practitionerSchema);
