import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListTreatmentsQuery } from "@/features/treatments/treatmentsApi";
import { useListDoctorsQuery } from "@/features/doctors/doctorsApi";
import { useListSlotsQuery } from "@/features/slots/slotsApi";
import { useCreateAppointmentMutation } from "@/features/appointments/appointmentsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { cn } from "@/lib/cn";
import { addDays, endOfDay, formatDate, formatTime, startOfDay } from "@/lib/dateTime";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
import { doctorName as formatDoctorName } from "@/lib/personName";
import type { Slot } from "@/types/api";

const STEP_LABELS = ["Treatment", "Dentist", "Date & time", "Review"];

export function BookAppointmentPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [step, setStep] = useState(0);
  const [treatmentId, setTreatmentId] = useState<string | null>(null);
  const [practitionerId, setPractitionerId] = useState<string | null | undefined>(undefined); // undefined = not chosen yet, null = no preference
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const { data: treatments, isLoading: treatmentsLoading } = useListTreatmentsQuery();
  const { data: doctors, isLoading: doctorsLoading } = useListDoctorsQuery();
  const [createAppointment, { isLoading: booking }] = useCreateAppointmentMutation();

  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => addDays(startOfDay(new Date()), i)), []);

  const { data: slots, isLoading: slotsLoading } = useListSlotsQuery(
    {
      practitioner: practitionerId ?? undefined,
      status: "OPEN",
      from: selectedDate.toISOString(),
      to: endOfDay(selectedDate).toISOString(),
    },
    { skip: step !== 2 },
  );
  const sortedSlots = useMemo(() => [...(slots ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time)), [slots]);

  const treatment = treatments?.find((t) => t._id === treatmentId);
  const selectedDoctor = doctors?.find((d) => d._id === practitionerId);
  const doctorName = selectedSlot ? formatDoctorName(selectedSlot.practitioner) : selectedDoctor ? formatDoctorName(selectedDoctor) : undefined;

  function goNext() {
    setStep((s) => Math.min(s + 1, 3));
  }
  function goBack() {
    if (step === 0) {
      navigate("/patient");
    } else {
      setStep((s) => s - 1);
    }
  }

  async function handleConfirm() {
    if (!selectedSlot || !treatmentId) return;
    try {
      await createAppointment({
        practitionerId: selectedSlot.practitioner._id,
        roomId: selectedSlot.room._id,
        treatmentId,
        startTime: selectedSlot.start_time,
        slotId: selectedSlot._id,
      }).unwrap();
      dispatch(showToast("Appointment booked!", "success"));
      navigate("/patient/appointments");
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  const canContinue = [!!treatmentId, practitionerId !== undefined, !!selectedSlot, true][step];

  return (
    <FadeIn className="mx-auto max-w-xl">
      <div className="mb-5 flex items-center gap-2.5">
        {STEP_LABELS.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-page")} />
        ))}
      </div>

      <button onClick={goBack} className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-faint hover:text-ink-soft">
        ← Back
      </button>

      <div className="font-heading text-xl font-bold text-ink">
        {step === 0 && "Choose a treatment"}
        {step === 1 && "Choose a dentist"}
        {step === 2 && "Pick a date & time"}
        {step === 3 && "Review & confirm"}
      </div>
      <div className="mt-1 mb-6 text-[13px] text-faint">Step {step + 1} of 4</div>

      {step === 0 && (
        <div className="flex flex-col gap-2.5">
          {treatmentsLoading ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (
            treatments?.map((t) => (
              <button
                key={t._id}
                onClick={() => setTreatmentId(t._id)}
                className={cn(
                  "flex items-center justify-between rounded-2xl border-2 bg-surface px-5 py-4 text-left shadow-[6px_6px_14px_rgba(163,184,204,0.2)] transition-colors",
                  treatmentId === t._id ? "border-primary" : "border-transparent",
                )}
              >
                <div>
                  <div className="text-[14.5px] font-bold text-ink">{t.label}</div>
                  <div className="mt-0.5 text-xs text-faint">{t.default_duration_mins} min</div>
                </div>
                <div className={cn("h-5.5 w-5.5 rounded-full border-2", treatmentId === t._id ? "border-primary bg-primary" : "border-border")} />
              </button>
            ))
          )}
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => setPractitionerId(null)}
            className={cn(
              "rounded-2xl border-2 border-dashed px-4 py-4 text-center text-[13.5px] font-bold transition-colors",
              practitionerId === null ? "border-primary text-primary" : "border-border text-muted",
            )}
          >
            No preference
          </button>
          {doctorsLoading ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {doctors?.map((d) => (
                <button
                  key={d._id}
                  onClick={() => setPractitionerId(d._id)}
                  className={cn(
                    "rounded-2xl border-2 bg-surface px-3 py-4 text-center shadow-[6px_6px_14px_rgba(163,184,204,0.2)] transition-colors",
                    practitionerId === d._id ? "border-primary" : "border-transparent",
                  )}
                >
                  <div className="mx-auto mb-2.5 h-12 w-12 rounded-full bg-primary-tint" />
                  <div className="text-[13.5px] font-bold text-ink">{formatDoctorName(d)}</div>
                  <div className="mt-0.5 text-[11.5px] text-faint">{d.specialties[0] ?? "General Dentistry"}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {days.map((day) => {
              const active = day.toDateString() === selectedDate.toDateString();
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex-shrink-0 rounded-2xl px-3.5 py-2.5 text-center transition-colors",
                    active ? "bg-primary text-white" : "bg-surface text-ink-soft",
                  )}
                >
                  <div className="text-[11px] font-semibold">{day.toLocaleDateString(undefined, { weekday: "short" })}</div>
                  <div className="mt-1 text-base font-bold">{day.getDate()}</div>
                </button>
              );
            })}
          </div>

          <div className="font-heading mt-6 mb-2.5 text-sm font-bold text-ink">Available times</div>
          {slotsLoading ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : sortedSlots.length === 0 ? (
            <div className="rounded-2xl bg-surface px-5 py-8 text-center text-sm text-faint">No open times this day — try another date.</div>
          ) : practitionerId ? (
            <div className="grid grid-cols-3 gap-2.5">
              {sortedSlots.map((slot) => (
                <button
                  key={slot._id}
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "rounded-xl border-2 px-2 py-2.5 text-center text-[13.5px] font-bold transition-colors",
                    selectedSlot?._id === slot._id ? "border-primary bg-primary text-white" : "border-border bg-surface text-ink-soft",
                  )}
                >
                  {formatTime(slot.start_time)}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedSlots.map((slot) => (
                <button
                  key={slot._id}
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors",
                    selectedSlot?._id === slot._id ? "border-primary bg-primary-tint" : "border-border bg-surface",
                  )}
                >
                  <span className="text-[13.5px] font-bold text-ink">{formatTime(slot.start_time)}</span>
                  <span className="text-xs text-faint">{formatDoctorName(slot.practitioner)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && selectedSlot && (
        <div className="flex flex-col gap-3.5 rounded-2xl bg-surface px-5 py-5 shadow-[6px_6px_14px_rgba(163,184,204,0.2)]">
          {[
            { label: "Treatment", value: treatment?.label ?? "" },
            { label: "Dentist", value: doctorName ?? "" },
            { label: "Date & time", value: `${formatDate(selectedSlot.start_time)} · ${formatTime(selectedSlot.start_time)}` },
            { label: "Location", value: `Bright Smile Dental · ${selectedSlot.room.name}` },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between border-b border-border pb-3.5 last:border-0 last:pb-0">
              <div>
                <div className="text-[11.5px] font-semibold tracking-wide text-placeholder uppercase">{row.label}</div>
                <div className="mt-0.5 text-sm font-bold text-ink">{row.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        fullWidth
        className="mt-7"
        disabled={!canContinue}
        loading={booking}
        onClick={step === 3 ? handleConfirm : goNext}
      >
        {step === 3 ? "Confirm booking" : "Continue"}
      </Button>
    </FadeIn>
  );
}
