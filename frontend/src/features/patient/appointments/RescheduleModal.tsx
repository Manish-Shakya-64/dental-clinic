import { useEffect, useMemo, useState } from "react";
import { useRescheduleAppointmentMutation } from "@/features/appointments/appointmentsApi";
import { useListSlotsQuery } from "@/features/slots/slotsApi";
import { useListDoctorsQuery } from "@/features/doctors/doctorsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { cn } from "@/lib/cn";
import { addDays, endOfDay, formatTime, startOfDay } from "@/lib/dateTime";
import { bookableSlots } from "@/lib/bookableSlots";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { doctorName, initials } from "@/lib/personName";
import type { Appointment, Slot } from "@/types/api";

export function RescheduleModal({ open, onClose, appointment }: { open: boolean; onClose: () => void; appointment: Appointment }) {
  const [practitionerId, setPractitionerId] = useState(appointment.practitioner._id);
  const [changingDoctor, setChangingDoctor] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [reschedule, { isLoading: saving }] = useRescheduleAppointmentMutation();
  const { data: doctors, isLoading: doctorsLoading } = useListDoctorsQuery(undefined, { skip: !open });
  const dispatch = useAppDispatch();

  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => addDays(startOfDay(new Date()), i)), []);

  useEffect(() => {
    if (!open) return;
    setPractitionerId(appointment.practitioner._id);
    setChangingDoctor(false);
    const initialStart = startOfDay(new Date(appointment.start_time));
    setSelectedDate(initialStart >= startOfDay(new Date()) ? initialStart : startOfDay(new Date()));
    setSelectedSlot(null);
  }, [open, appointment]);

  const { data: slots, isFetching: slotsLoading } = useListSlotsQuery(
    {
      practitioner: practitionerId,
      status: "OPEN",
      from: selectedDate.toISOString(),
      to: endOfDay(selectedDate).toISOString(),
    },
    { skip: !open },
  );
  const sortedSlots = useMemo(() => bookableSlots(slots), [slots]);

  const currentDoctor = doctors?.find((d) => d._id === practitionerId);

  function pickDoctor(id: string) {
    setPractitionerId(id);
    setSelectedSlot(null);
    setChangingDoctor(false);
  }

  async function handleSave() {
    if (!selectedSlot) return;
    try {
      await reschedule({
        id: appointment._id,
        startTime: selectedSlot.start_time,
        practitionerId: selectedSlot.practitioner._id,
        roomId: selectedSlot.room._id,
        slotId: selectedSlot._id,
      }).unwrap();
      dispatch(showToast("Appointment rescheduled", "success"));
      onClose();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={480}>
      <div className="font-heading mb-1 text-[17px] font-bold text-ink">Reschedule appointment</div>
      <div className="mb-4 text-[13px] text-faint">
        {appointment.reason.label} with {currentDoctor ? doctorName(currentDoctor) : doctorName(appointment.practitioner)}
      </div>

      {changingDoctor ? (
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <div className="text-xs font-bold text-ink-soft">Choose a dentist</div>
            <button type="button" onClick={() => setChangingDoctor(false)} className="text-xs font-bold text-primary">
              Cancel
            </button>
          </div>
          {doctorsLoading ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {doctors?.map((d) => (
                <button
                  key={d._id}
                  onClick={() => pickDoctor(d._id)}
                  className={cn(
                    "rounded-2xl border-2 bg-surface px-2 py-3.5 text-center shadow-[6px_6px_14px_rgba(163,184,204,0.2)] transition-colors",
                    practitionerId === d._id ? "border-primary" : "border-transparent",
                  )}
                >
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-tint text-xs font-bold text-primary">
                    {initials(d)}
                  </div>
                  <div className="text-[12.5px] font-bold text-ink">{doctorName(d)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((day) => {
              const active = day.toDateString() === selectedDate.toDateString();
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day);
                    setSelectedSlot(null);
                  }}
                  className={cn(
                    "flex-shrink-0 rounded-2xl px-3 py-2 text-center transition-colors",
                    active ? "bg-primary text-white" : "bg-surface text-ink-soft",
                  )}
                >
                  <div className="text-[10.5px] font-semibold">{day.toLocaleDateString(undefined, { weekday: "short" })}</div>
                  <div className="mt-0.5 text-[13.5px] font-bold">{day.getDate()}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 mb-2.5 flex items-center justify-between">
            <div className="font-heading text-sm font-bold text-ink">Available times</div>
            <button type="button" onClick={() => setChangingDoctor(true)} className="text-[12.5px] font-bold text-primary">
              Change dentist
            </button>
          </div>

          {slotsLoading ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : sortedSlots.length === 0 ? (
            <div className="rounded-2xl bg-surface-alt px-5 py-6 text-center text-[13.5px] text-faint">
              No open times with {currentDoctor ? doctorName(currentDoctor) : "this dentist"} on this day.
              <div className="mt-2.5">
                <button type="button" onClick={() => setChangingDoctor(true)} className="text-[13px] font-bold text-primary">
                  Try a different dentist →
                </button>
              </div>
            </div>
          ) : (
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
          )}
        </>
      )}

      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving} disabled={!selectedSlot}>
          Confirm new time
        </Button>
      </div>
    </Modal>
  );
}
