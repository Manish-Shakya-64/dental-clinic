import { useParams, useNavigate } from "react-router-dom";
import { useGetAppointmentQuery, useMarkAppointmentCompleteMutation } from "@/features/appointments/appointmentsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { formatDate, formatTime } from "@/lib/dateTime";
import { statusStyle } from "@/lib/statusColor";
import { fullName } from "@/lib/personName";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { PatientHistoryPanel } from "@/features/doctor/consultation/PatientHistoryPanel";
import { ConsultationNotePanel } from "@/features/doctor/consultation/ConsultationNotePanel";
import { PrescribedMedicines } from "@/features/doctor/consultation/PrescribedMedicines";

const TERMINAL_STATUSES = new Set(["CANCELLED", "COMPLETED", "BILLED", "CHECKED_OUT", "RECALL_SCHEDULED", "NO_SHOW"]);

export function ConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data: appointment, isLoading, isError, error } = useGetAppointmentQuery(appointmentId!);
  const [markComplete, { isLoading: completing }] = useMarkAppointmentCompleteMutation();

  if (isLoading) {
    return (
      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !appointment) {
    return <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>;
  }

  const isTerminal = TERMINAL_STATUSES.has(appointment.status);
  const style = statusStyle(appointment.status);

  async function handleComplete() {
    try {
      await markComplete(appointment!._id).unwrap();
      dispatch(showToast("Appointment marked complete", "success"));
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  return (
    <FadeIn>
      <button onClick={() => navigate(-1)} className="mb-4 text-[13px] font-bold text-faint hover:text-ink-soft">
        ← Back
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-6 py-4 shadow-[4px_4px_12px_rgba(163,184,204,0.15)]">
        <div>
          <div className="font-heading text-lg font-bold text-ink">{fullName(appointment.patient)}</div>
          <div className="mt-0.5 text-xs text-faint">
            {appointment.reason.label} · {formatDate(appointment.start_time)} · {formatTime(appointment.start_time)}
          </div>
        </div>
        <Pill bg={style.bg} color="#fff">
          {style.label}
        </Pill>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <h2 className="font-heading mb-4 text-[19px] font-bold text-ink">{fullName(appointment.patient)} · History</h2>
          <PatientHistoryPanel patientId={appointment.patient._id} excludeAppointmentId={appointment._id} />
        </div>

        <div className="flex-1">
          <h2 className="font-heading mb-4 text-[19px] font-bold text-ink">New consultation note</h2>
          <ConsultationNotePanel appointmentId={appointment._id} initialNote={appointment.clinical_note?.note_text ?? ""} />

          <h2 className="font-heading mt-5 mb-2.5 text-[15px] font-bold text-ink">Prescribed medicines</h2>
          <PrescribedMedicines appointmentId={appointment._id} medicines={appointment.medicines} />

          <Button fullWidth className="mt-6" loading={completing} disabled={isTerminal} onClick={handleComplete}>
            {isTerminal ? "Visit already closed" : "Mark appointment complete"}
          </Button>
        </div>
      </div>
    </FadeIn>
  );
}
