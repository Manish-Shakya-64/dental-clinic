import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCancelAppointmentMutation, useGetAppointmentQuery } from "@/features/appointments/appointmentsApi";
import { useGetBillForAppointmentQuery, useLazyGetBillPdfQuery } from "@/features/bills/billsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { formatDate, formatTime } from "@/lib/dateTime";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FadeIn } from "@/components/ui/FadeIn";
import { RescheduleModal } from "@/features/patient/appointments/RescheduleModal";
import { doctorName } from "@/lib/personName";
import { isTerminal, isUpcoming } from "@/lib/appointmentState";

const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });

export function AppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { data: appointment, isLoading, isError, error } = useGetAppointmentQuery(appointmentId!);
  const { data: bill } = useGetBillForAppointmentQuery(appointmentId!, { skip: !appointment || !isTerminal(appointment.status) });
  const [triggerPdf, { isFetching: printing }] = useLazyGetBillPdfQuery();
  const [cancelAppointment, { isLoading: cancelling }] = useCancelAppointmentMutation();

  const [rescheduling, setRescheduling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function handleCancel() {
    try {
      await cancelAppointment(appointmentId!).unwrap();
      dispatch(showToast("Appointment cancelled", "success"));
      setConfirmCancel(false);
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  async function handlePrint() {
    if (!bill) return;
    try {
      const blob = await triggerPdf(bill._id).unwrap();
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !appointment) {
    return <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>;
  }

  const upcoming = isUpcoming(appointment);
  const isCancelled = appointment.status === "CANCELLED" || appointment.status === "NO_SHOW";

  return (
    <FadeIn>
      <button onClick={() => navigate(-1)} className="mb-4 text-[13px] font-bold text-faint hover:text-ink-soft">
        ← Back
      </button>

      {/* The appointment itself on the left, what you can do about it on the right. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      {upcoming ? (
        <>
          <div className="space-y-4">
          <div className="rounded-[22px] bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-[10px_10px_24px_rgba(61,125,191,0.28)]">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold tracking-wide text-white/85 uppercase">Upcoming</div>
              <div className="text-xs font-bold tracking-wide text-white/85">{appointment.appointment_code}</div>
            </div>
            <div className="font-heading mt-2 text-lg font-bold">{appointment.reason.label}</div>
            <div className="mt-1.5 text-sm text-white/90">
              {formatDate(appointment.start_time)} · {formatTime(appointment.start_time)}
            </div>
            <div className="mt-0.5 text-sm text-white/90">with {doctorName(appointment.practitioner)}</div>
          </div>

          <div className="rounded-2xl bg-surface px-4 py-3.5 text-[12.5px] text-ink-soft shadow-[4px_4px_12px_rgba(163,184,204,0.15)]">
            Show the front desk your appointment code <span className="font-bold text-ink">{appointment.appointment_code}</span> to check in
            when you arrive.
          </div>
          </div>

          <div className="space-y-4">
          <div className="flex gap-2.5">
            <Button variant="outline" className="flex-1" onClick={() => setRescheduling(true)}>
              Reschedule
            </Button>
            <Button
              className="flex-1 border-[1.5px] border-coral bg-transparent text-coral shadow-none hover:bg-coral/10"
              onClick={() => setConfirmCancel(true)}
            >
              Cancel appointment
            </Button>
          </div>

          <div className="rounded-2xl bg-amber-tint px-4 py-3.5 text-[12.5px] text-amber-ink">
            Cancelling within 24 hours may incur a fee. You'll be asked to confirm before we cancel.
          </div>
          </div>
        </>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-[11.5px] font-bold tracking-wide text-placeholder uppercase">{isCancelled ? appointment.status.replaceAll("_", " ") : "Completed"}</div>
              <div className="text-[11.5px] font-bold tracking-wide text-placeholder">{appointment.appointment_code}</div>
            </div>
            <div className="font-heading mt-2 text-lg font-bold text-ink">{appointment.reason.label}</div>
            <div className="mt-1.5 text-[13.5px] text-faint">
              {formatDate(appointment.start_time)} · {formatTime(appointment.start_time)}
            </div>
            <div className="mt-0.5 text-[13.5px] text-faint">with {doctorName(appointment.practitioner)}</div>
          </Card>

          <div className="space-y-4">
          {!isCancelled && (
            <div>
              <div className="font-heading mb-2.5 text-[15px] font-bold text-ink">Visit summary</div>
              <Card className="bg-surface-alt text-[13.5px] leading-relaxed text-ink-soft shadow-none">
                {appointment.clinical_note?.note_text ?? "No visit summary was recorded for this appointment."}
              </Card>
            </div>
          )}

          {bill && (
            <Card>
              <div className="mb-2.5 text-[11.5px] font-bold tracking-wide text-placeholder uppercase">Bill · #{bill.bill_number}</div>
              <div className="flex items-center justify-between text-[14.5px] font-bold text-ink">
                <span>Total</span>
                <span>{currency.format(bill.amount)}</span>
              </div>
              <Button variant="outline" fullWidth className="mt-4" onClick={handlePrint} loading={printing}>
                View bill
              </Button>
            </Card>
          )}
          </div>
        </>
      )}
      </div>

      <RescheduleModal open={rescheduling} onClose={() => setRescheduling(false)} appointment={appointment} />
      <ConfirmModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="Cancel appointment?"
        description="Cancelling within 24 hours of your appointment may incur a fee. This can't be undone."
        confirmLabel="Cancel appointment"
      />
    </FadeIn>
  );
}
