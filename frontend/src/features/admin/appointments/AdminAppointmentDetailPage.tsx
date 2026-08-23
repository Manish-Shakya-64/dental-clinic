import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetAppointmentQuery } from "@/features/appointments/appointmentsApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
import { formatDate, formatTime } from "@/lib/dateTime";
import { doctorName, fullName, genderLabel } from "@/lib/personName";
import { statusStyle } from "@/lib/statusColor";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-border py-2.5 last:border-b-0">
      <div className="w-36 shrink-0 text-[13px] font-bold text-placeholder">{label}</div>
      <div className="min-w-0 flex-1 text-[13.5px] text-ink">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-heading mb-3 text-[15px] font-bold text-ink">{children}</h3>;
}

/** Full read-only record of a single visit. Admins don't treat patients, so nothing here is
 *  editable — the clinical note and prescription stay owned by the treating dentist. */
export function AdminAppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { data: appointment, isLoading, isError, error } = useGetAppointmentQuery(appointmentId!);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !appointment) {
    return <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>;
  }

  const style = statusStyle(appointment.status);
  const patient = appointment.patient;

  return (
    <FadeIn>
      <button onClick={() => navigate("/admin/appointments")} className="mb-4 text-[13px] font-bold text-faint hover:text-ink-soft">
        ← Back to appointments
      </button>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-ink">{appointment.reason.label}</h2>
          <div className="mt-1 font-mono text-[12.5px] font-bold text-faint">{appointment.appointment_code}</div>
        </div>
        <Pill bg={`${style.bg}1A`} color={style.color}>
          {style.label}
        </Pill>
      </div>

      {/* Two independent columns on wide screens — the visit/patient facts and the clinical record
        * are read separately, so stacking them into one narrow column just adds scrolling. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
        <Card>
          <SectionTitle>Visit</SectionTitle>
          <Row label="Date">{formatDate(appointment.start_time)}</Row>
          <Row label="Time">
            {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
          </Row>
          <Row label="Dentist">{doctorName(appointment.practitioner)}</Row>
          <Row label="Room">{appointment.room.name}</Row>
          <Row label="Treatment">
            {appointment.reason.label} · {appointment.reason.default_duration_mins} mins
          </Row>
          <Row label="Booked on">{formatDate(appointment.createdAt)}</Row>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <SectionTitle>Patient</SectionTitle>
            <Button variant="outline" onClick={() => navigate(`/admin/patients/${patient._id}/edit`)}>
              Edit profile
            </Button>
          </div>
          <Row label="Name">{fullName(patient)}</Row>
          <Row label="Email">{patient.email}</Row>
          <Row label="Phone">{patient.phone}</Row>
          <Row label="Date of birth">{formatDate(patient.dob)}</Row>
          <Row label="Gender">{genderLabel(patient.gender)}</Row>
          {patient.address && <Row label="Address">{patient.address}</Row>}
          {patient.medical_history && (
            <Row label="Medical history">
              <span className="whitespace-pre-wrap">{patient.medical_history}</span>
            </Row>
          )}
        </Card>
        </div>

        <div className="flex flex-col gap-4">
        <Card>
          <SectionTitle>Clinical note</SectionTitle>
          {appointment.clinical_note?.note_text ? (
            <>
              <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap text-ink-soft">{appointment.clinical_note.note_text}</p>
              <div className="mt-3 text-[12px] text-faint">Recorded {formatDate(appointment.clinical_note.created_at)}</div>
            </>
          ) : (
            <p className="text-[13.5px] text-faint">The dentist hasn't recorded a note for this visit.</p>
          )}
        </Card>

        <Card>
          <SectionTitle>Prescribed medicines</SectionTitle>
          {appointment.medicines.length === 0 ? (
            <p className="text-[13.5px] text-faint">No medicines were prescribed at this visit.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {appointment.medicines.map((m, i) => (
                <div key={i} className="rounded-xl bg-surface-alt px-4 py-3">
                  <div className="text-[13.5px] font-bold text-ink">
                    {m.name} <span className="font-semibold text-muted">· {m.dosage}</span>
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-muted">{m.instructions}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
        </div>
        </div>
    </FadeIn>
  );
}
