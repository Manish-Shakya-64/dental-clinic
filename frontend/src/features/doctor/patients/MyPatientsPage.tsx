import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListAppointmentsQuery } from "@/features/appointments/appointmentsApi";
import { formatDate } from "@/lib/dateTime";
import { Input } from "@/components/ui/Input";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { getApiErrorMessage } from "@/api/apiSlice";
import { fullName } from "@/lib/personName";
import type { Appointment } from "@/types/api";

interface PatientSummary {
  patientId: string;
  name: string;
  lastVisit: Appointment;
  visitCount: number;
}

export function MyPatientsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error } = useListAppointmentsQuery({ limit: 100 });
  const navigate = useNavigate();

  const patients = useMemo<PatientSummary[]>(() => {
    if (!data) return [];
    const byPatient = new Map<string, PatientSummary>();
    for (const appt of data.data) {
      const existing = byPatient.get(appt.patient._id);
      if (!existing) {
        byPatient.set(appt.patient._id, { patientId: appt.patient._id, name: fullName(appt.patient), lastVisit: appt, visitCount: 1 });
      } else {
        existing.visitCount += 1;
        if (appt.start_time > existing.lastVisit.start_time) existing.lastVisit = appt;
      }
    }
    return [...byPatient.values()].sort((a, b) => b.lastVisit.start_time.localeCompare(a.lastVisit.start_time));
  }, [data]);

  const filtered = patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-5 max-w-sm">
        <Input placeholder="Search patients…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading && <SkeletonRows count={6} />}

      {isError && (
        <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="rounded-2xl bg-surface px-5 py-8 text-center text-sm text-faint">No patients found.</div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <StaggerList className="flex flex-col gap-2.5">
          {filtered.map((p) => (
            <StaggerItem key={p.patientId}>
              <button
                onClick={() => navigate(`/doctor/consultation/${p.lastVisit._id}`)}
                className="flex w-full items-center justify-between rounded-2xl bg-surface px-5 py-4 text-left shadow-[4px_4px_12px_rgba(163,184,204,0.15)] transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <div className="text-sm font-bold text-ink">{p.name}</div>
                  <div className="mt-0.5 text-xs text-faint">
                    {p.visitCount} visit{p.visitCount === 1 ? "" : "s"} · last {formatDate(p.lastVisit.start_time)}
                  </div>
                </div>
                <div className="text-xs font-bold text-primary">{p.lastVisit.reason.label}</div>
              </button>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
