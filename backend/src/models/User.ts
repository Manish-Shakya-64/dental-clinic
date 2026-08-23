import { Schema, model, Document, Types } from "mongoose";
import { fieldEncryptionPlugin } from "../utils/fieldEncryptionPlugin.js";
import { Role } from "../types/auth.types.js";

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  email_hash: string;
  password_hash: string;
  role: Role;
  patient?: Types.ObjectId;
  staff?: Types.ObjectId;
  practitioner?: Types.ObjectId;
  mfa_enabled: boolean;
  reset_token_hash?: string | null;
  reset_token_expires?: Date | null;
  last_login_at?: Date | null;
  is_active: boolean;
  /** Incremented on logout/password-reset to invalidate previously issued refresh tokens. */
  token_version: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    // Ciphertext is never equal across two encryptions of the same plaintext (random IV), so
    // uniqueness is enforced on email_hash below, not on this field.
    email: { type: String, required: true },
    email_hash: { type: String, required: true, unique: true, index: true },
    password_hash: { type: String, required: true, select: false },
    role: { type: String, enum: ["PATIENT", "RECEPTIONIST", "ADMIN", "DOCTOR"], required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", default: null },
    staff: { type: Schema.Types.ObjectId, ref: "StaffMember", default: null },
    practitioner: { type: Schema.Types.ObjectId, ref: "Practitioner", default: null },
    mfa_enabled: { type: Boolean, default: false },
    reset_token_hash: { type: String, default: null, select: false },
    reset_token_expires: { type: Date, default: null, select: false },
    last_login_at: { type: Date, default: null },
    is_active: { type: Boolean, default: true },
    token_version: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

userSchema.plugin(fieldEncryptionPlugin, { fields: ["email"], blindIndexFields: ["email"] });

export const User = model<IUser>("User", userSchema);
