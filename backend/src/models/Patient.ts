import { Schema, model, Document, Types } from "mongoose";
import { fieldEncryptionPlugin } from "../utils/fieldEncryptionPlugin.js";
import { Gender } from "../types/person.types.js";

export interface IPatient extends Document {
  _id: Types.ObjectId;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  gender: Gender;
  /** Stored as an encrypted ISO-8601 date string (e.g. "1990-05-14") — encryption only applies to
   *  string fields, so Date values are serialized at the API boundary via Zod's z.coerce.date(). */
  dob: string;
  phone: string;
  phone_hash: string;
  email: string;
  email_hash: string;
  address?: string;
  medical_history?: string;
  /** Generated filename under uploads/profile-images/, never the client-supplied name. */
  profile_image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<IPatient>(
  {
    first_name: { type: String, required: true },
    middle_name: { type: String },
    last_name: { type: String },
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], required: true },
    // Stored as an encrypted string (ISO date text); parsed back to a Date by the service layer.
    dob: { type: String, required: true },
    phone: { type: String, required: true },
    phone_hash: { type: String, required: true, index: true },
    email: { type: String, required: true },
    email_hash: { type: String, required: true, unique: true, index: true },
    address: { type: String },
    medical_history: { type: String },
    profile_image: { type: String, default: null },
  },
  { timestamps: true },
);

patientSchema.plugin(fieldEncryptionPlugin, {
  fields: ["first_name", "middle_name", "last_name", "dob", "phone", "email", "address", "medical_history"],
  blindIndexFields: ["phone", "email"],
});

export const Patient = model<IPatient>("Patient", patientSchema);
