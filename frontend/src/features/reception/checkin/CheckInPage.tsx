import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLazyListAppointmentsQuery, useCheckInAppointmentMutation } from "@/features/appointments/appointmentsApi";
import { useLazyListPatientsQuery } from "@/features/patients/patientsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { cn } from "@/lib/cn";
import { endOfDay, formatDate, formatTime, startOfDay } from "@/lib/dateTime";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FadeIn, StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { doctorName, fullName } from "@/lib/personName";
import type { Appointment, Patient } from "@/types/api";

type Mode = "code" | "patient";

const CHECK_INABLE = new Set<Appointment["status"]>(["CONFIRMED", "REMINDED", "RECONFIRMED"]);

const MODES: { key: Mode; label: string; placeholder: string }[] = [
  { key: "code", label: "By appointment code", placeholder: "APT-20260814-0007" },
  { key: "patient", label: "By phone or email", placeholder: "Patient's phone or email" },
];

function SearchIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="#9FB2C3" strokeWidth="2" />
      <path d="M21 21l-4-4" stroke="#9FB2C3" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ResultPlaceholder({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="flex min-h-[280px] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt">
        <SearchIcon />
      </div>
      <div className="max-w-sm text-[14.5px] text-muted">{message}</div>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Search again
        </Button>
      )}
    </Card>
  );
}

function AppointmentResultCard({
  appointment,
  onCheckIn,
  checkingIn,
}: {
  appointment: Appointment;
  onCheckIn: (id: string) => void;
  checkingIn: boolean;
}) {
  const navigate = useNavigate();
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11.5px] font-bold tracking-wide text-placeholder uppercase">{appointment.appointment_code}</div>
          <div className="font-heading mt-1.5 text-[17px] font-bold text-ink">{fullName(appointment.patient)}</div>
          <div className="mt-1 text-[13.5px] text-faint">
            {appointment.reason.label} · {formatTime(appointment.start_time)} · {formatDate(appointment.start_time)} ·{" "}
            {doctorName(appointment.practitioner)}
          </div>
        </div>

        {CHECK_INABLE.has(appointment.status) ? (
          <Button variant="amber" onClick={() => onCheckIn(appointment._id)} loading={checkingIn}>
            Mark as Waiting
          </Button>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl bg-teal-tint px-5 py-3">
            <span className="text-[13.5px] font-semibold text-[#2E7A6C]">Status: {appointment.status.replaceAll("_", " ")}</span>
            <button onClick={() => navigate(`/reception/checkout/${appointment._id}`)} className="text-[13px] font-bold text-primary">
              Open →
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Search controls on the left, results on the right. Keeping the search state here (rather than
 *  inside per-mode child components) is what lets the two live in separate columns — a child can't
 *  render into two different grid cells. */
export function CheckInPage() {
  const [mode, setMode] = useState<Mode>("code");
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const dispatch = useAppDispatch();

  const [searchAppointments, { data: apptData, isFetching: searchingAppointments }] = useLazyListAppointmentsQuery();
  const [searchPatients, { isFetching: searchingPatients }] = useLazyListPatientsQuery();
  const [checkIn, { isLoading: checkingIn }] = useCheckInAppointmentMutation();

  const searching = searchingAppointments || searchingPatients;
  const results = apptData?.data ?? [];
  const activeMode = MODES.find((m) => m.key === mode)!;

  function reset() {
    setQuery("");
    setSearched(false);
    setPatient(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    reset();
  }

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearched(true);
    setPatient(null);

    if (mode === "code") {
      await searchAppointments({ code: trimmed });
      return;
    }

    try {
      const isEmail = trimmed.includes("@");
      const found = (await searchPatients(isEmail ? { email: trimmed } : { phone: trimmed }).unwrap()).data[0] ?? null;
      setPatient(found);
      if (found) {
        const today = new Date();
        await searchAppointments({
          patient: found._id,
          from: startOfDay(today).toISOString(),
          to: endOfDay(today).toISOString(),
        }).unwrap();
      }
    } catch {
      setPatient(null);
    }
  }

  async function handleCheckIn(appointmentId: string) {
    try {
      await checkIn(appointmentId).unwrap();
      dispatch(showToast("Patient marked as waiting", "success"));
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  function renderResults() {
    if (!searched) {
      return <ResultPlaceholder message="Search by appointment code, or by the patient's phone or email, to check them in." />;
    }
    if (searching) {
      return <ResultPlaceholder message="Searching…" />;
    }
    if (mode === "patient" && !patient) {
      return <ResultPlaceholder message="No patient matches that phone or email. Double-check with the patient and try again." onRetry={reset} />;
    }
    if (results.length === 0) {
      const message =
        mode === "code"
          ? "No appointment matches that code. Double-check with the patient and try again."
          : `${patient ? fullName(patient) : "That patient"} has no appointment scheduled for today.`;
      return <ResultPlaceholder message={message} onRetry={reset} />;
    }
    return (
      <FadeIn>
        <StaggerList className="flex flex-col gap-3">
          {results.map((appt) => (
            <StaggerItem key={appt._id}>
              <AppointmentResultCard appointment={appt} onCheckIn={handleCheckIn} checkingIn={checkingIn} />
            </StaggerItem>
          ))}
        </StaggerList>
      </FadeIn>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <Card>
        <div className="font-heading mb-1 text-[22px] font-bold text-ink">Check-in patient</div>
        <div className="mb-5 text-[13px] text-faint">
          Ask the patient for their appointment code (sent by email and shown on their appointment page), or look them up by phone/email if
          they don't have it handy.
        </div>

        <div className="mb-5 flex gap-1 rounded-full bg-surface-alt p-1">
          {MODES.map((t) => (
            <button
              key={t.key}
              onClick={() => switchMode(t.key)}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-[12.5px] font-bold transition-colors",
                mode === t.key ? "bg-primary text-white" : "text-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Input
          placeholder={activeMode.placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button variant="secondary" fullWidth className="mt-3" onClick={handleSearch} loading={searching}>
          Search
        </Button>
      </Card>

      <div>{renderResults()}</div>
    </div>
  );
}
