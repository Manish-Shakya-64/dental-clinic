import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListAppointmentsQuery } from "@/features/appointments/appointmentsApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/lib/dateTime";
import { statusStyle } from "@/lib/statusColor";
import { doctorName } from "@/lib/personName";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StaggerItem, StaggerList } from "@/components/ui/FadeIn";

const TERMINAL = new Set(["CANCELLED", "NO_SHOW", "COMPLETED", "BILLED", "CHECKED_OUT", "RECALL_SCHEDULED"]);

export function AppointmentsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const { data, isLoading, isError, error } = useListAppointmentsQuery({ limit: 100 });

  const filtered = useMemo(() => {
    const all = data?.data ?? [];
    const now = Date.now();
    return all
      .filter((a) => {
        const isFuture = new Date(a.start_time).getTime() >= now && !TERMINAL.has(a.status);
        return tab === "upcoming" ? isFuture : !isFuture;
      })
      .sort((a, b) => (tab === "upcoming" ? a.start_time.localeCompare(b.start_time) : b.start_time.localeCompare(a.start_time)));
  }, [data, tab]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex gap-1 rounded-full bg-surface p-1 shadow-[3px_3px_8px_rgba(163,184,204,0.2)]">
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn("rounded-full px-5 py-2 text-[13px] font-bold capitalize transition-colors", tab === t ? "bg-primary text-white" : "text-muted")}
            >
              {t}
            </button>
          ))}
        </div>
        <Button onClick={() => navigate("/patient/book")}>+ Book</Button>
      </div>

      {isLoading && <SkeletonRows count={4} />}
      {isError && <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>}

      {!isLoading && !isError && (
        <>
          {filtered.length === 0 ? (
            <Card className="text-center text-sm text-faint">{tab === "upcoming" ? "No upcoming appointments." : "No past visits yet."}</Card>
          ) : (
            <StaggerList className="flex flex-col gap-2.5">
              {filtered.map((appt) => {
                const style = statusStyle(appt.status);
                return (
                  <StaggerItem key={appt._id}>
                    <button
                      onClick={() => navigate(`/patient/appointments/${appt._id}`)}
                      className="flex w-full items-center justify-between rounded-2xl bg-surface px-5 py-4 text-left shadow-[4px_4px_12px_rgba(163,184,204,0.15)]"
                    >
                      <div>
                        <div className="text-sm font-bold text-ink">{appt.reason.label}</div>
                        <div className="mt-0.5 text-xs text-faint">
                          {formatDate(appt.start_time)} · {formatTime(appt.start_time)} · {doctorName(appt.practitioner)}
                        </div>
                        <div className="mt-1 text-[11px] font-bold tracking-wide text-placeholder">{appt.appointment_code}</div>
                      </div>
                      <Pill bg={style.bg} color="#fff">
                        {style.label}
                      </Pill>
                    </button>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          )}
        </>
      )}
    </div>
  );
}
