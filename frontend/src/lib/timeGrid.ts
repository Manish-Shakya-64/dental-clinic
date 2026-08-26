import type { WorkingHours } from "@/types/api";

const SLOT_MINUTES = 30;
/** Used when a dentist has no roster configured, and by screens that show every dentist at once
 *  and so can't key off any single one. */
const DEFAULT_OPEN_MIN = 8 * 60;
const DEFAULT_CLOSE_MIN = 18 * 60;

function label(totalMinutes: number): string {
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function rowsBetween(openMin: number, closeMin: number): string[] {
  const count = Math.max(1, Math.ceil((closeMin - openMin) / SLOT_MINUTES));
  return Array.from({ length: count }, (_, i) => label(openMin + i * SLOT_MINUTES));
}

export const TIME_ROWS: string[] = rowsBetween(DEFAULT_OPEN_MIN, DEFAULT_CLOSE_MIN);

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Rows spanning a single dentist's working day — earliest start to latest finish across the days
 *  they actually work, so the grid fits the person you're scheduling rather than a fixed 8-to-6
 *  guess. A dentist with no roster set falls back to clinic-wide defaults rather than rendering an
 *  empty grid. */
export function timeRowsFor(workingHours?: WorkingHours): string[] {
  const blocks = Object.values(workingHours ?? {}).flat().filter(Boolean);
  if (blocks.length === 0) return TIME_ROWS;

  const starts = blocks.map((b) => toMinutes(b.start));
  const ends = blocks.map((b) => toMinutes(b.end));
  // Snapped outwards to the surrounding half-hour so a 09:20 start still gets a visible row.
  const openMin = Math.floor(Math.min(...starts) / SLOT_MINUTES) * SLOT_MINUTES;
  const closeMin = Math.ceil(Math.max(...ends) / SLOT_MINUTES) * SLOT_MINUTES;
  return rowsBetween(openMin, closeMin);
}

export function dateAtTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

export function timeKey(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}
