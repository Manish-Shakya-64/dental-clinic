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

const CHECK_INABLE = new Set<Appointment["status"]>(["CONFIRMED", "REMINDED", "RECONFIRMED"]);

function NotFound({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="#9FB2C3" strokeWidth="2" />
          <path d="M21 21l-4-4" stroke="#9FB2C3" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-[14.5px] text-muted">{message}</div>
      <Button variant="outline" className="mt-5" onClick={onRetry}>
        Search again
      </Button>
    </div>
  );
}

function AppointmentResultCard({ appointment, onCheckIn, checkingIn }: { appointment: Appointment; onCheckIn: (id: string) => void; checkingIn: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl bg-surface-alt px-5 py-5 shadow-[6px_6px_16px_rgba(163,184,204,0.2)]">
      <div className="text-[11.5px] font-bold tracking-wide text-placeholder uppercase">{appointment.appointment_code}</div>
      <div className="font-heading mt-2 text-[17px] font-bold text-ink">{fullName(appointment.patient)}</div>
      <div className="mt-1 text-[13.5px] text-faint">
        {appointment.reason.label} · {formatTime(appointment.start_time)} · {formatDate(appointment.start_time)} · {doctorName(appointment.practitioner)}
      </div>

      {CHECK_INABLE.has(appointment.status) ? (
        <Button variant="amber" fullWidth className="mt-4" onClick={() => onCheckIn(appointment._id)} loading={checkingIn}>
          Mark as Waiting
        </Button>
      ) : (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-teal-tint px-5 py-4">
          <span className="text-[13.5px] font-semibold text-[#2E7A6C]">Status: {appointment.status.replaceAll("_", " ")}</span>
          <button onClick={() => navigate(`/reception/checkout/${appointment._id}`)} className="text-[13px] font-bold text-primary">
            Open →
          </button>
        </div>
      )}
    </div>
  );
}

export function CheckInPage() {
  const [mode, setMode] = useState<"code" | "patient">("code");
  const dispatch = useAppDispatch();

  const [checkIn, { isLoading: checkingIn }] = useCheckInAppointmentMutation();

  async function handleCheckIn(appointmentId: string) {
    try {
      await checkIn(appointmentId).unwrap();
      dispatch(showToast("Patient marked as waiting", "success"));
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <div className="font-heading mb-1 text-[22px] font-bold text-ink">Check-in patient</div>
        <div className="mb-5 text-[13px] text-faint">
          Ask the patient for their appointment code (sent by email and shown on their appointment page), or look them up by phone/email if
          they don't have it handy.
        </div>

        <div className="mb-5 flex gap-1 rounded-full bg-surface-alt p-1">
          {([
            { key: "code", label: "By appointment code" },
            { key: "patient", label: "By phone or email" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={cn(
                "flex-1 rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
                mode === t.key ? "bg-primary text-white" : "text-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === "code" ? (
          <CheckInByCode onCheckIn={handleCheckIn} checkingIn={checkingIn} />
        ) : (
          <CheckInByPatient onCheckIn={handleCheckIn} checkingIn={checkingIn} />
        )}
      </Card>
    </div>
  );
}

function CheckInByCode({ onCheckIn, checkingIn }: { onCheckIn: (id: string) => void; checkingIn: boolean }) {
  const [code, setCode] = useState("");
  const [searched, setSearched] = useState(false);
  const [search, { data, isFetching }] = useLazyListAppointmentsQuery();

  const appointment = data?.data[0];

  function handleSearch() {
    if (!code.trim()) return;
    setSearched(true);
    search({ code: code.trim() });
  }

  function reset() {
    setCode("");
    setSearched(false);
  }

  return (
    <>
      <div className="flex gap-3">
        <Input
          placeholder="APT-20260814-0007"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button variant="secondary" onClick={handleSearch} loading={isFetching}>
          Search
        </Button>
      </div>

      {searched && !isFetching && (
        <FadeIn className="mt-6">
          {appointment ? (
            <AppointmentResultCard appointment={appointment} onCheckIn={onCheckIn} checkingIn={checkingIn} />
          ) : (
            <NotFound message="No appointment matches that code. Double-check with the patient and try again." onRetry={reset} />
          )}
        </FadeIn>
      )}
    </>
  );
}

function CheckInByPatient({ onCheckIn, checkingIn }: { onCheckIn: (id: string) => void; checkingIn: boolean }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [searchPatients, { isFetching: searchingPatients }] = useLazyListPatientsQuery();
  const [searchAppointments, { data: apptData, isFetching: searchingAppointments }] = useLazyListAppointmentsQuery();

  const searching = searchingPatients || searchingAppointments;
  const todaysAppointments = apptData?.data ?? [];

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearched(true);
    setPatient(null);
    try {
      const isEmail = trimmed.includes("@");
      const result = await searchPatients(isEmail ? { email: trimmed } : { phone: trimmed }).unwrap();
      const found = result.data[0] ?? null;
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

  function reset() {
    setQuery("");
    setSearched(false);
    setPatient(null);
  }

  return (
    <>
      <div className="flex gap-3">
        <Input
          placeholder="Patient's phone or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button variant="secondary" onClick={handleSearch} loading={searching}>
          Search
        </Button>
      </div>

      {searched && !searching && (
        <FadeIn className="mt-6">
          {!patient ? (
            <NotFound message="No patient matches that phone or email. Double-check with the patient and try again." onRetry={reset} />
          ) : todaysAppointments.length === 0 ? (
            <NotFound message={`${fullName(patient)} has no appointment scheduled for today.`} onRetry={reset} />
          ) : (
            <StaggerList className="flex flex-col gap-3">
              {todaysAppointments.map((appt) => (
                <StaggerItem key={appt._id}>
                  <AppointmentResultCard appointment={appt} onCheckIn={onCheckIn} checkingIn={checkingIn} />
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </FadeIn>
      )}
    </>
  );
}
