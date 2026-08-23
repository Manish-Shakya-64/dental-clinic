import { Appointment } from "../models/Appointment.js";
import { logger } from "../utils/logger.js";

/** Sweeps DRAFT appointments whose lock has expired (normally only reachable via a mid-request
 *  crash — see bookingService.createBooking) so their slot frees up again. */
export async function runLockExpiryJob(): Promise<void> {
  const result = await Appointment.updateMany(
    { status: "DRAFT", lock_expires_at: { $lt: new Date() } },
    { $set: { status: "LOCK_EXPIRED", lock_token: null } },
  );

  if (result.modifiedCount > 0) {
    logger.info({ count: result.modifiedCount }, "[lockExpiryJob] expired stale draft locks");
  }
}
