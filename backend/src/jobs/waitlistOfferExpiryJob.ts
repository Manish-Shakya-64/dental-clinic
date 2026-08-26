import { WaitlistOffer } from "../models/WaitlistOffer.js";
import { logger } from "../utils/logger.js";

/** Closes out offers nobody claimed.
 *
 *  `acceptOffer` already refuses an expired token, so this isn't what protects correctness — it
 *  keeps the records honest, so an unclaimed offer reads as EXPIRED rather than sitting PENDING
 *  forever and looking like it's still live. */
export async function runWaitlistOfferExpiryJob(): Promise<void> {
  const result = await WaitlistOffer.updateMany(
    { status: "PENDING", expires_at: { $lte: new Date() } },
    { $set: { status: "EXPIRED" } },
  );

  logger.info({ count: result.modifiedCount }, "[waitlistOfferExpiryJob] run");
}
