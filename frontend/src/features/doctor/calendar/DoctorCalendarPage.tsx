import { useMemo, useState } from "react";
import { useListAppointmentsQuery } from "@/features/appointments/appointmentsApi";
import { addDays, endOfDay, formatDayHeading, formatShortDay, isSameDay, startOfDay, startOfWeek } from "@/lib/dateTime";
import { Button } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StaggerList } from "@/components/ui/FadeIn";
import { AppointmentRow } from "@/features/doctor/calendar/AppointmentRow";
import { getApiErrorMessage } from "@/api/apiSlice";

type ViewMode = "day" | "week";

export function DoctorCalendarPage() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("day");

  const rangeStart = view === "day" ? startOfDay(anchorDate) : startOfWeek(anchorDate);
  const rangeEnd = view === "day" ? endOfDay(anchorDate) : endOfDay(addDays(rangeStart, 6));

  const { data, isLoading, isFetching, isError, error } = useListAppointmentsQuery({
    from: rangeStart.toISOString(),
    to: rangeEnd.toISOString(),
  });

  const sorted = useMemo(
    () => (data ? [...data.data].sort((a, b) => a.start_time.localeCompare(b.start_time)) : []),
    [data],
  );

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i)), [rangeStart]);

  function shiftDate(days: number) {
    setAnchorDate((prev) => addDays(prev, view === "day" ? days : days * 7));
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-lg font-bold text-ink">{formatDayHeading(anchorDate)}</h2>
          <div className="flex gap-1.5">
            <button
              onClick={() => shiftDate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface text-ink-soft shadow-[3px_3px_8px_rgba(163,184,204,0.2)]"
            >
              ‹
            </button>
            <button
              onClick={() => shiftDate(1)}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface text-ink-soft shadow-[3px_3px_8px_rgba(163,184,204,0.2)]"
            >
              ›
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-full bg-surface p-1 shadow-[3px_3px_8px_rgba(163,184,204,0.2)]">
            {(["day", "week"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`rounded-full px-4.5 py-2 text-[13px] font-bold capitalize transition-colors ${
                  view === mode ? "bg-primary text-white" : "text-muted"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => setAnchorDate(new Date())}>
            Today
          </Button>
        </div>
      </div>

      {isLoading && <SkeletonRows count={6} />}

      {isError && (
        <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">
          {getApiErrorMessage(error)}
        </div>
      )}

      {!isLoading && !isError && view === "day" && (
        <StaggerList className="flex flex-col gap-2.5">
          {sorted.length === 0 ? (
            <EmptyState message="No appointments scheduled for this day." />
          ) : (
            sorted.map((appt) => <AppointmentRow key={appt._id} appointment={appt} />)
          )}
        </StaggerList>
      )}

      {!isLoading && !isError && view === "week" && (
        <div className="flex flex-col gap-6">
          {days.map((day) => {
            const dayAppts = sorted.filter((a) => isSameDay(new Date(a.start_time), day));
            return (
              <div key={day.toISOString()}>
                <div className="mb-2.5 flex items-center gap-2 text-[13px] font-bold text-ink-soft">
                  {formatShortDay(day)}
                  <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[11px] text-primary">{dayAppts.length}</span>
                </div>
                {dayAppts.length === 0 ? (
                  <div className="rounded-2xl bg-surface/60 px-5 py-3 text-xs text-placeholder">No appointments</div>
                ) : (
                  <StaggerList className="flex flex-col gap-2">
                    {dayAppts.map((appt) => (
                      <AppointmentRow key={appt._id} appointment={appt} />
                    ))}
                  </StaggerList>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isFetching && !isLoading && <div className="mt-3 text-xs font-semibold text-placeholder">Refreshing…</div>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl bg-surface px-5 py-8 text-center text-sm text-faint">{message}</div>;
}
