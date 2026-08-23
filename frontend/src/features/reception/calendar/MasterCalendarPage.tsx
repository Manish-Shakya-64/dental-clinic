import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListStaffQuery } from "@/features/staff/staffApi";
import { useListAppointmentsQuery } from "@/features/appointments/appointmentsApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { addDays, endOfDay, formatDayHeading, startOfDay } from "@/lib/dateTime";
import { TIME_ROWS, timeKey } from "@/lib/timeGrid";
import { statusStyle } from "@/lib/statusColor";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { BookingModal } from "@/features/reception/calendar/BookingModal";
import { fullName, staffRowName } from "@/lib/personName";
import type { Appointment } from "@/types/api";

const LEGEND: { status: Appointment["status"]; label: string }[] = [
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "WAITING", label: "Waiting" },
  { status: "IN_CONSULT", label: "In Consult" },
  { status: "COMPLETED", label: "Completed" },
];

export function MasterCalendarPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => new Date());
  const { data: staff, isLoading: staffLoading } = useListStaffQuery({ limit: 200 });
  const doctors = useMemo(() => staff?.data.filter((s) => s.role === "DOCTOR" && s.is_active) ?? [], [staff]);

  const {
    data,
    isLoading: apptsLoading,
    isFetching,
    isError,
    error,
  } = useListAppointmentsQuery({ from: startOfDay(date).toISOString(), to: endOfDay(date).toISOString() });

  const grid = useMemo(() => {
    const map = new Map<string, Appointment>();
    for (const appt of data?.data ?? []) {
      map.set(`${appt.practitioner._id}|${timeKey(appt.start_time)}`, appt);
    }
    return map;
  }, [data]);

  const [bookingOpen, setBookingOpen] = useState(false);

  const loading = staffLoading || apptsLoading;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-lg font-bold text-ink">{formatDayHeading(date)}</h2>
          <div className="flex gap-1.5">
            <button
              onClick={() => setDate((d) => addDays(d, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface text-ink-soft shadow-[3px_3px_8px_rgba(163,184,204,0.2)]"
            >
              ‹
            </button>
            <button
              onClick={() => setDate((d) => addDays(d, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface text-ink-soft shadow-[3px_3px_8px_rgba(163,184,204,0.2)]"
            >
              ›
            </button>
          </div>
          <Button variant="outline" onClick={() => setDate(new Date())}>
            Today
          </Button>
        </div>
        <Button onClick={() => setBookingOpen(true)}>+ New booking</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        {LEGEND.map((l) => {
          const style = statusStyle(l.status);
          return (
            <div key={l.status} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-[3px]" style={{ background: style.bg }} />
              <div className="text-xs font-semibold text-muted">{l.label}</div>
            </div>
          );
        })}
      </div>

      {isError && <div className="mb-3 rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>}

      {loading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : doctors.length === 0 ? (
        <div className="rounded-2xl bg-surface px-5 py-8 text-center text-sm text-faint">No doctors on staff yet.</div>
      ) : (
        <Card padded={false} className={`overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
          <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `70px repeat(${doctors.length}, 1fr)` }}>
            <div className="border-b border-border p-3" />
            {doctors.map((d) => (
              <div key={d.practitionerId} className="border-b border-l border-border p-3 text-center text-[13px] font-bold text-ink">
                {staffRowName(d)}
              </div>
            ))}

            {TIME_ROWS.map((time) => (
              <div key={time} className="contents">
                <div className="border-b border-border p-2.5 text-[11.5px] text-placeholder">{time}</div>
                {doctors.map((d) => {
                  const appt = grid.get(`${d.practitionerId}|${time}`);
                  const style = appt ? statusStyle(appt.status) : null;
                  return (
                    <div key={d.practitionerId + time} className="border-b border-l border-border p-1.5 align-top">
                      {appt && style ? (
                        <button
                          onClick={() => navigate(`/reception/checkout/${appt._id}`)}
                          className="w-full rounded-[10px] px-2.5 py-2 text-left transition-transform hover:scale-[1.02]"
                          style={{ background: style.bg }}
                        >
                          <div className="truncate text-[11.5px] font-bold text-white">{fullName(appt.patient)}</div>
                          <div className="truncate text-[10.5px] text-white/85">{appt.reason.label}</div>
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      )}

      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} doctors={doctors} defaultDate={date} />
    </div>
  );
}
