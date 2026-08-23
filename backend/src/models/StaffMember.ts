import { Schema, model, Document, Types } from "mongoose";
import { fieldEncryptionPlugin } from "../utils/fieldEncryptionPlugin.js";
import { Gender } from "../types/person.types.js";

export type StaffRole = "RECEPTIONIST" | "ADMIN";

export interface IStaffMember extends Document {
  _id: Types.ObjectId;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  gender: Gender;
  email: string;
  email_hash: string;
  phone?: string;
  role: StaffRole;
  is_active: boolean;
  /** Generated filename under uploads/profile-images/, never the client-supplied name. */
  profile_image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const staffMemberSchema = new Schema<IStaffMember>(
  {
    first_name: { type: String, required: true },
    middle_name: { type: String },
    last_name: { type: String },
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], required: true },
    email: { type: String, required: true },
    email_hash: { type: String, required: true, unique: true, index: true },
    phone: { type: String },
    role: { type: String, enum: ["RECEPTIONIST", "ADMIN"], required: true },
    is_active: { type: Boolean, default: true },
    profile_image: { type: String, default: null },
  },
  { timestamps: true },
);

staffMemberSchema.plugin(fieldEncryptionPlugin, {
  fields: ["email", "phone"],
  blindIndexFields: ["email"],
});

export const StaffMember = model<IStaffMember>("StaffMember", staffMemberSchema);
