import { useMemo, useState } from "react";
import { useListStaffQuery } from "@/features/staff/staffApi";
import { useListRoomsQuery } from "@/features/rooms/roomsApi";
import { useListSlotsQuery } from "@/features/slots/slotsApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { addDays, endOfDay, formatShortDay, startOfWeek } from "@/lib/dateTime";
import { timeRowsFor, dateAtTime, dayKey, timeKey } from "@/lib/timeGrid";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { AddSlotModal } from "@/features/admin/slots/AddSlotModal";
import { EditSlotModal } from "@/features/admin/slots/EditSlotModal";
import { staffRowName } from "@/lib/personName";
import type { Slot } from "@/types/api";

const LEGEND: { status: Slot["status"]; label: string; color: string }[] = [
  { status: "OPEN", label: "Open", color: "var(--color-teal)" },
  { status: "BLOCKED", label: "Blocked", color: "var(--color-border)" },
  { status: "BOOKED", label: "Booked", color: "var(--color-primary)" },
];

const STATUS_COLOR: Record<Slot["status"], string> = {
  OPEN: "var(--color-teal)",
  BLOCKED: "var(--color-border)",
  BOOKED: "var(--color-primary)",
};

export function SlotsPage() {
  const { data: staff, isLoading: staffLoading } = useListStaffQuery({ limit: 200 });
  const { data: rooms, isLoading: roomsLoading } = useListRoomsQuery();
  const doctors = useMemo(() => staff?.data.filter((s) => s.role === "DOCTOR" && s.practitionerId) ?? [], [staff]);

  const [doctorId, setDoctorId] = useState<string | null>(null);
  const activeDoctorId = doctorId ?? doctors[0]?.practitionerId ?? "";
  const activeDoctor = doctors.find((d) => d.practitionerId === activeDoctorId);
  // The grid spans this dentist's own working day, so switching dentist reshapes it rather than
  // showing everyone the same fixed 8-to-6 window.
  const timeRows = useMemo(() => timeRowsFor(activeDoctor?.working_hours), [activeDoctor]);

  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const weekStart = startOfWeek(weekAnchor);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const { data: slots, isLoading: slotsLoading, isError, error } = useListSlotsQuery(
    { practitioner: activeDoctorId, from: weekStart.toISOString(), to: endOfDay(addDays(weekStart, 6)).toISOString() },
    { skip: !activeDoctorId },
  );

  const slotGrid = useMemo(() => {
    const map = new Map<string, Slot>();
    for (const slot of slots ?? []) {
      map.set(`${dayKey(slot.start_time)}|${timeKey(slot.start_time)}`, slot);
    }
    return map;
  }, [slots]);

  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultStart, setAddDefaultStart] = useState<Date>(new Date());
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);

  /** A cell is dead once its start time has gone by — including earlier today, not just earlier
   *  days. The API refuses to create a slot in the past, so leaving these clickable only produced
   *  an error after the fact. */
  function isPastCell(day: Date, hhmm: string): boolean {
    return dateAtTime(day, hhmm).getTime() <= Date.now();
  }

  function openCell(day: Date, hhmm: string) {
    const existing = slotGrid.get(`${day.toDateString()}|${hhmm}`);
    if (existing) {
      setEditingSlot(existing);
      return;
    }
    if (isPastCell(day, hhmm)) return;
    setAddDefaultStart(dateAtTime(day, hhmm));
    setAddOpen(true);
  }

  /** The toolbar button must always open the *add* form — routing it through openCell meant that
   *  whenever the week's first cell happened to be taken, "+ Add slot" silently opened the edit
   *  dialog for that unrelated slot instead. Defaults to the first free cell in the visible week. */
  function firstFreeFutureCell(): Date | null {
    for (const day of days) {
      for (const time of timeRows) {
        if (!slotGrid.has(`${day.toDateString()}|${time}`) && !isPastCell(day, time)) {
          return dateAtTime(day, time);
        }
      }
    }
    return null;
  }

  function openAdd() {
    const cell = firstFreeFutureCell();
    if (!cell) return;
    setAddDefaultStart(cell);
    setAddOpen(true);
  }

  // Nothing to add into when the whole visible week has already been and gone.
  const canAddThisWeek = firstFreeFutureCell() !== null;

  const loading = staffLoading || roomsLoading;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64 rounded-full" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (doctors.length === 0) {
    return <div className="rounded-2xl bg-surface px-5 py-8 text-center text-sm text-faint">No doctors on staff yet — add one from the Staff page first.</div>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={activeDoctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="rounded-full border border-border bg-surface px-4 py-2.5 text-[13px] font-bold text-ink outline-none focus:border-primary"
          >
            {doctors.map((d) => (
              <option key={d.practitionerId} value={d.practitionerId}>
                {staffRowName(d)}
              </option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <button onClick={() => setWeekAnchor((d) => addDays(d, -7))} className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface text-ink-soft shadow-[3px_3px_8px_rgba(163,184,204,0.2)]">
              ‹
            </button>
            <button onClick={() => setWeekAnchor((d) => addDays(d, 7))} className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface text-ink-soft shadow-[3px_3px_8px_rgba(163,184,204,0.2)]">
              ›
            </button>
          </div>
          <Button variant="outline" onClick={() => setWeekAnchor(new Date())}>
            Today
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {LEGEND.map((l) => (
            <div key={l.status} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-[3px]" style={{ background: l.color }} />
              <div className="text-xs font-semibold text-muted">{l.label}</div>
            </div>
          ))}
          <Button onClick={openAdd} disabled={!canAddThisWeek} title={canAddThisWeek ? undefined : "This week has already passed"}>
            + Add slot
          </Button>
        </div>
      </div>

      {isError && <div className="mb-3 rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>}

      <Card padded={false} className={`overflow-x-auto ${slotsLoading ? "opacity-60" : ""}`}>
        <div className="grid min-w-[760px] grid-cols-[60px_repeat(7,1fr)]">
          <div className="border-b border-border p-2.5" />
          {days.map((day) => (
            <div key={day.toISOString()} className="border-b border-l border-border p-2.5 text-center text-[12.5px] font-bold text-ink">
              {formatShortDay(day)}
            </div>
          ))}

          {timeRows.map((time) => (
            <div key={time} className="contents">
              <div className="border-b border-border p-2 text-[11px] text-placeholder">{time}</div>
              {days.map((day) => {
                const slot = slotGrid.get(`${day.toDateString()}|${time}`);
                const past = isPastCell(day, time);
                // An existing slot stays reachable even in the past so it can still be reviewed or
                // tidied up; only creating a new one is off the table.
                const disabled = past && !slot;
                return (
                  <button
                    key={day.toISOString() + time}
                    onClick={() => openCell(day, time)}
                    disabled={disabled}
                    title={disabled ? "This time has already passed" : undefined}
                    // A past cell is deliberately styled identically to a live one — shading or
                    // hatching it broke the grid's consistency. The cursor and tooltip carry the
                    // affordance instead, and it simply doesn't respond to a click.
                    className={cn(
                      "border-b border-l border-border p-1.5",
                      disabled ? "cursor-not-allowed" : "",
                    )}
                  >
                    <div
                      className={cn("h-[30px] rounded-lg transition-transform", !disabled && "hover:scale-[1.03]")}
                      style={{ background: slot ? STATUS_COLOR[slot.status] : "transparent" }}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {rooms && (
        <AddSlotModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          doctors={doctors}
          rooms={rooms}
          defaultDoctorId={activeDoctorId}
          defaultStart={addDefaultStart}
        />
      )}
      <EditSlotModal open={!!editingSlot} onClose={() => setEditingSlot(null)} slot={editingSlot} />
    </div>
  );
}
