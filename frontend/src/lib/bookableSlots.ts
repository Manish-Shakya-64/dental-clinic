/** A slot is only bookable while it is still ahead of us. The API refuses to book a time that has
 *  already passed, so showing past slots in a picker offers choices that can only fail — which is
 *  exactly how reception ended up selecting a stale slot and getting an error instead of a booking. */

interface SlotLike {
  start_time: string;
}

export function isSlotBookable(slot: SlotLike): boolean {
  return new Date(slot.start_time).getTime() > Date.now();
}

/** Drops past slots and returns the rest in chronological order — the shape every picker wants. */
export function bookableSlots<T extends SlotLike>(slots: T[] | undefined): T[] {
  return [...(slots ?? [])].filter(isSlotBookable).sort((a, b) => a.start_time.localeCompare(b.start_time));
}

/** `YYYY-MM-DD` for today, for use as `min` on a date input so past days can't be picked. */
export function todayISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** `YYYY-MM-DDTHH:mm` for now, for use as `min` on a datetime-local input. */
export function nowISOMinute(): string {
  const d = new Date();
  return `${todayISODate()}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
