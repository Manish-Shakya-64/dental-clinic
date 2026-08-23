import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useListAppointmentsQuery } from "@/features/appointments/appointmentsApi";
import { useListStaffQuery } from "@/features/staff/staffApi";
import { useGetPatientQuery } from "@/features/patients/patientsApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { TableAction } from "@/components/ui/TableAction";
import { Eye } from "lucide-react";
import { formatDate, formatTime } from "@/lib/dateTime";
import { doctorName, fullName, staffRowName } from "@/lib/personName";
import { statusStyle } from "@/lib/statusColor";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { AppointmentStatus } from "@/types/api";

const GRID_COLS = "grid-cols-[1.3fr_1.6fr_1.5fr_1.4fr_1.4fr_1fr_0.7fr]";
const PAGE_SIZE = 10;

const STATUS_OPTIONS: AppointmentStatus[] = [
  "CONFIRMED",
  "REMINDED",
  "RECONFIRMED",
  "WAITING",
  "COMPLETED",
  "BILLED",
  "CHECKED_OUT",
  "RECALL_SCHEDULED",
  "CANCELLED",
  "NO_SHOW",
];

const selectClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/** The admin's clinic-wide view of every appointment — reception's calendar is day-and-dentist
 *  shaped, which is the wrong tool for "find this one visit across all of last quarter". */
export function AdminAppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const patientId = searchParams.get("patient") ?? "";

  const [code, setCode] = useState("");
  const [practitioner, setPractitioner] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const debouncedCode = useDebouncedValue(code);

  const { data: doctors } = useListStaffQuery({ role: "DOCTOR", is_active: true, limit: 100 });
  // Only to label the "filtered to one patient" banner — the list itself is already scoped by the
  // patient query param, so this is presentation, not a second source of truth.
  const { data: patient } = useGetPatientQuery(patientId, { skip: !patientId });

  const { data, isLoading, isFetching, isError, error } = useListAppointmentsQuery({
    ...(debouncedCode.trim() ? { code: debouncedCode.trim() } : {}),
    ...(patientId ? { patient: patientId } : {}),
    ...(practitioner ? { practitioner } : {}),
    ...(status ? { status } : {}),
    ...(from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
    ...(to ? { to: new Date(`${to}T23:59:59`).toISOString() } : {}),
    page,
    limit: PAGE_SIZE,
  });

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  const hasFilters = !!(code || practitioner || status || from || to || patientId);

  function clearFilters() {
    setCode("");
    setPractitioner("");
    setStatus("");
    setFrom("");
    setTo("");
    setPage(1);
    setSearchParams({});
  }

  return (
    <div>
      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Appointment code" className="min-w-0">
            <Input placeholder="APT-…" value={code} onChange={(e) => resetToFirstPage(setCode)(e.target.value)} />
          </Field>
          <Field label="Dentist" className="min-w-0">
            <select value={practitioner} onChange={(e) => resetToFirstPage(setPractitioner)(e.target.value)} className={selectClass}>
              <option value="">All dentists</option>
              {doctors?.data.map((d) => (
                <option key={d.practitionerId} value={d.practitionerId}>
                  {staffRowName(d)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" className="min-w-0">
            <select value={status} onChange={(e) => resetToFirstPage(setStatus)(e.target.value)} className={selectClass}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {statusStyle(s).label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From" className="min-w-0">
            <Input type="date" value={from} onChange={(e) => resetToFirstPage(setFrom)(e.target.value)} />
          </Field>
          <Field label="To" className="min-w-0">
            <Input type="date" value={to} onChange={(e) => resetToFirstPage(setTo)(e.target.value)} />
          </Field>
        </div>

        {hasFilters && (
          <div className="mt-4 flex items-center gap-3">
            {patientId && patient && (
              <div className="rounded-full bg-primary/10 px-3.5 py-1.5 text-[12.5px] font-bold text-primary">
                Patient: {fullName(patient)}
              </div>
            )}
            <Button variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {isLoading && <SkeletonRows count={8} />}
      {isError && <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>}

      {!isLoading && !isError && data && (
        <>
          <Card padded={false} className={`overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
            <div className="min-w-[860px]">
              <div className={`grid ${GRID_COLS} border-b border-border px-5 py-3.5 text-[12px] font-bold tracking-wide text-placeholder uppercase`}>
                <div>Code</div>
                <div>Patient</div>
                <div>Dentist</div>
                <div>Treatment</div>
                <div>Date &amp; time</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              {data.data.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-faint">No appointments match these filters.</div>
              ) : (
                <StaggerList>
                  {data.data.map((a, i) => {
                    const style = statusStyle(a.status);
                    return (
                      <StaggerItem key={a._id}>
                        <div
                          className={`grid ${GRID_COLS} w-full items-center px-5 py-3.5 text-left text-[13.5px] ${i !== data.data.length - 1 ? "border-b border-border" : ""}`}
                        >
                          <div className="font-mono text-[12px] font-bold text-ink-soft">{a.appointment_code}</div>
                          <div className="truncate font-bold text-ink">{fullName(a.patient)}</div>
                          <div className="truncate text-muted">{doctorName(a.practitioner)}</div>
                          <div className="truncate text-muted">{a.reason.label}</div>
                          <div className="text-muted">
                            {formatDate(a.start_time)} · {formatTime(a.start_time)}
                          </div>
                          <div>
                            <Pill bg={`${style.bg}1A`} color={style.color}>
                              {style.label}
                            </Pill>
                          </div>
                          <div className="flex items-center gap-1">
                            <TableAction icon={Eye} label="View appointment" onClick={() => navigate(`/admin/appointments/${a._id}`)} />
                          </div>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerList>
              )}
            </div>
          </Card>

          <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
