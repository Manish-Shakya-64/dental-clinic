import type { Appointment, AppointmentStatus } from "@/types/api";

/** Statuses the backend refuses to modify any further (see bookingService's TERMINAL_STATUSES).
 *  Kept in one place because three screens previously each declared their own copy, and they had
 *  already drifted apart in how they used it. */
export const TERMINAL_STATUSES: ReadonlySet<AppointmentStatus> = new Set<AppointmentStatus>([
  "CANCELLED",
  "NO_SHOW",
  "COMPLETED",
  "BILLED",
  "CHECKED_OUT",
  "RECALL_SCHEDULED",
]);

export function isTerminal(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** True while a visit is still ahead of the patient or actively happening.
 *
 *  Status alone isn't enough: nothing moved a lapsed appointment off CONFIRMED until the no-show
 *  sweep was added, and even now there's a grace period where a finished appointment still reads
 *  as CONFIRMED. So an appointment counts as upcoming only if it is *both* non-terminal and not
 *  yet finished.
 *
 *  The boundary is `end_time`, not `start_time` — a visit that started ten minutes ago is in
 *  progress, not in the past. */
export function isUpcoming(appointment: Pick<Appointment, "status" | "end_time">): boolean {
  return !isTerminal(appointment.status) && new Date(appointment.end_time).getTime() >= Date.now();
}
