import { useNavigate, useParams } from "react-router-dom";
import { useGetAppointmentQuery, useCheckInAppointmentMutation, useCompleteCheckoutMutation } from "@/features/appointments/appointmentsApi";
import { useGetBillForAppointmentQuery, useGenerateBillMutation, useEmailBillMutation, useLazyGetBillPdfQuery } from "@/features/bills/billsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { formatDate, formatTime } from "@/lib/dateTime";
import { statusStyle } from "@/lib/statusColor";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
import { doctorName, fullName } from "@/lib/personName";
import type { AppointmentStatus } from "@/types/api";
import { formatAUD } from "@/lib/currency";

const CHECK_INABLE = new Set<AppointmentStatus>(["CONFIRMED", "REMINDED", "RECONFIRMED"]);
// Billing can't happen until the doctor marks the visit complete — the backend enforces this too,
// so these are shown as "in progress" rather than as a Generate bill button that would just 409.
const IN_PROGRESS = new Set<AppointmentStatus>(["WAITING", "CHECKED_IN", "IN_CONSULT"]);
const AWAITING_BILL = new Set<AppointmentStatus>(["COMPLETED"]);
const CLOSED = new Set<AppointmentStatus>(["CHECKED_OUT", "RECALL_SCHEDULED"]);

export function CheckoutPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { data: appointment, isLoading, isError, error } = useGetAppointmentQuery(appointmentId!);
  const { data: bill, isLoading: billLoading } = useGetBillForAppointmentQuery(appointmentId!, {
    skip: !appointment || CHECK_INABLE.has(appointment.status),
  });

  const [checkIn, { isLoading: checkingIn }] = useCheckInAppointmentMutation();
  const [generateBill, { isLoading: generating }] = useGenerateBillMutation();
  const [emailBill, { isLoading: emailing }] = useEmailBillMutation();
  const [completeCheckout, { isLoading: checkingOut }] = useCompleteCheckoutMutation();
  const [triggerPdf, { isFetching: printing }] = useLazyGetBillPdfQuery();

  async function handleCheckIn() {
    try {
      await checkIn(appointmentId!).unwrap();
      dispatch(showToast("Patient marked as waiting", "success"));
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  async function handleGenerateBill() {
    try {
      await generateBill(appointmentId!).unwrap();
      dispatch(showToast("Bill generated", "success"));
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

  async function handleEmail() {
    if (!bill) return;
    try {
      await emailBill(bill._id).unwrap();
      dispatch(showToast(`Bill emailed to ${appointment?.patient.email}`, "success"));
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  async function handleCompleteCheckout() {
    try {
      await completeCheckout(appointmentId!).unwrap();
      dispatch(showToast("Checkout complete", "success"));
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (isError || !appointment) {
    return <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>;
  }

  const style = statusStyle(appointment.status);

  return (
    <FadeIn>
      <button onClick={() => navigate(-1)} className="mb-4 text-[13px] font-bold text-faint hover:text-ink-soft">
        ← Back
      </button>

      {/* Who the visit is for on the left, the one action it currently needs on the right. */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11.5px] font-bold tracking-wide text-placeholder uppercase">{appointment.appointment_code}</div>
            <div className="font-heading mt-1.5 text-[17px] font-bold text-ink">{fullName(appointment.patient)}</div>
          </div>
          <Pill bg={style.bg} color="#fff">
            {style.label}
          </Pill>
        </div>

        <div className="mt-4 space-y-2.5 border-t border-border pt-4 text-[13.5px]">
          {[
            ["Treatment", appointment.reason.label],
            ["Dentist", doctorName(appointment.practitioner)],
            ["Date", formatDate(appointment.start_time)],
            ["Time", formatTime(appointment.start_time)],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-4">
              <div className="w-24 shrink-0 font-bold text-placeholder">{label}</div>
              <div className="min-w-0 text-ink">{value}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
      {CHECK_INABLE.has(appointment.status) && (
        <Button variant="amber" fullWidth loading={checkingIn} onClick={handleCheckIn}>
          Mark as Waiting
        </Button>
      )}

      {IN_PROGRESS.has(appointment.status) && (
        <Card className="text-center">
          <div className="text-[13.5px] font-semibold text-muted">
            Waiting for the doctor to complete this visit before it can be billed.
          </div>
        </Card>
      )}

      {AWAITING_BILL.has(appointment.status) && (
        <Button fullWidth loading={generating} onClick={handleGenerateBill}>
          Generate bill
        </Button>
      )}

      {appointment.status === "BILLED" && (
        <Card>
          {billLoading || !bill ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : (
            <>
              <div className="mb-3 text-[11.5px] font-bold tracking-wide text-placeholder uppercase">Bill preview · #{bill.bill_number}</div>
              <div className="flex justify-between border-b border-border py-2 text-[13.5px] text-ink-soft">
                <span>{appointment.reason.label}</span>
                <span className="font-bold text-ink">{formatAUD(bill.amount)}</span>
              </div>
              <div className="flex justify-between pt-3 text-[14.5px] font-bold text-ink">
                <span>Total</span>
                <span>{formatAUD(bill.amount)}</span>
              </div>

              <div className="mt-5 flex gap-2.5">
                <Button variant="outline" className="flex-1" onClick={handlePrint} loading={printing}>
                  Print bill
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleEmail} loading={emailing}>
                  Email bill to patient
                </Button>
              </div>
              <Button fullWidth className="mt-3" onClick={handleCompleteCheckout} loading={checkingOut}>
                Complete checkout
              </Button>
            </>
          )}
        </Card>
      )}

      {CLOSED.has(appointment.status) && (
        <Card className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal-tint">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#2E7A6C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-[14.5px] font-bold text-ink">Visit checked out</div>
          <div className="mt-1 text-[13px] text-faint">A recall reminder has been scheduled for this patient.</div>
          {bill && (
            <Button variant="outline" className="mt-4" onClick={handlePrint} loading={printing}>
              Print bill
            </Button>
          )}
        </Card>
      )}
      </div>
      </div>
    </FadeIn>
  );
}
