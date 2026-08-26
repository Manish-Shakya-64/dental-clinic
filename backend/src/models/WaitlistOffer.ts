import { Schema, model, Document, Types } from "mongoose";

export type WaitlistOfferStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "SUPERSEDED";

export interface IWaitlistOffer extends Document {
  _id: Types.ObjectId;
  waitlist: Types.ObjectId;
  patient: Types.ObjectId;
  slot: Types.ObjectId;
  treatment: Types.ObjectId;
  /** SHA-256 of the token emailed to the patient — same approach as password reset, so a database
   *  leak can't be used to claim anyone's slot. */
  token_hash: string;
  expires_at: Date;
  status: WaitlistOfferStatus;
  /** Set once the patient accepts, linking the offer to what it produced. */
  appointment?: Types.ObjectId | null;
  responded_at?: Date | null;
  createdAt: Date;
}

const waitlistOfferSchema = new Schema<IWaitlistOffer>(
  {
    waitlist: { type: Schema.Types.ObjectId, ref: "Waitlist", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    slot: { type: Schema.Types.ObjectId, ref: "Slot", required: true },
    treatment: { type: Schema.Types.ObjectId, ref: "Treatment", required: true },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "SUPERSEDED"],
      default: "PENDING",
      required: true,
    },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
    responded_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Used when one acceptance has to close out the competing offers on the same slot.
waitlistOfferSchema.index({ slot: 1, status: 1 });
// Used by the expiry sweep.
waitlistOfferSchema.index({ status: 1, expires_at: 1 });

export const WaitlistOffer = model<IWaitlistOffer>("WaitlistOffer", waitlistOfferSchema);
