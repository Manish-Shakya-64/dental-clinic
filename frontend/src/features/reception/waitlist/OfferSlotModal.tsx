import { useMemo, useState } from "react";
import { useListSlotsQuery } from "@/features/slots/slotsApi";
import { useOfferSlotMutation, useSendWaitlistOfferMutation } from "@/features/waitlist/waitlistApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/lib/dateTime";
import { bookableSlots } from "@/lib/bookableSlots";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { doctorName, fullName } from "@/lib/personName";
import type { Waitlist } from "@/types/api";

export function OfferSlotModal({ open, onClose, entry }: { open: boolean; onClose: () => void; entry: Waitlist | null }) {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [offerSlot, { isLoading }] = useOfferSlotMutation();
  const [sendOffer, { isLoading: sending }] = useSendWaitlistOfferMutation();
  const dispatch = useAppDispatch();

  const { data: slots, isLoading: loadingSlots } = useListSlotsQuery(
    { practitioner: entry?.preferred_practitioner?._id, status: "OPEN" },
    { skip: !open || !entry },
  );

  // Offering a slot that has already passed just produces a booking error and no email.
  const sorted = useMemo(() => bookableSlots(slots), [slots]);

  /** Books outright — for when the patient is on the phone and can say yes there and then. */
  async function handleBookNow() {
    if (!entry || !selectedSlotId) return;
    try {
      await offerSlot({ id: entry._id, slotId: selectedSlotId }).unwrap();
      dispatch(showToast(`Slot booked for ${fullName(entry.patient)}`, "success"));
      setSelectedSlotId(null);
      onClose();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  /** Emails an accept link instead, leaving the slot open until the patient claims it. */
  async function handleSendOffer() {
    if (!entry || !selectedSlotId) return;
    try {
      await sendOffer({ id: entry._id, slotId: selectedSlotId }).unwrap();
      dispatch(showToast(`Offer emailed to ${fullName(entry.patient)}`, "success"));
      setSelectedSlotId(null);
      onClose();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  if (!entry) return null;

  return (
    <Modal open={open} onClose={onClose} maxWidth={440}>
      <div className="font-heading mb-1 text-[17px] font-bold text-ink">Offer a slot</div>
      <div className="mb-4 text-[13px] text-faint">
        {entry.patient ? fullName(entry.patient) : ""} · {entry.reason?.label}
        {entry.preferred_practitioner ? ` · ${doctorName(entry.preferred_practitioner)}` : ""}
      </div>

      {loadingSlots ? (
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl bg-surface-alt px-4 py-6 text-center text-sm text-faint">
          No upcoming open slots. Once one frees up, this patient is emailed automatically.
        </div>
      ) : (
        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {sorted.map((slot) => (
            <button
              key={slot._id}
              onClick={() => setSelectedSlotId(slot._id)}
              className={cn(
                "rounded-xl border px-3.5 py-3 text-left transition-colors",
                selectedSlotId === slot._id ? "border-primary bg-primary-tint" : "border-border bg-surface hover:bg-surface-alt",
              )}
            >
              <div className="text-[13.5px] font-bold text-ink">
                {formatDate(slot.start_time)} · {formatTime(slot.start_time)}
              </div>
              <div className="mt-0.5 text-xs text-faint">
                {doctorName(slot.practitioner)} · {slot.room.name}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        <div className="flex gap-2.5">
          <Button variant="outline" className="flex-1" onClick={handleSendOffer} loading={sending} disabled={!selectedSlotId}>
            Email offer
          </Button>
          <Button className="flex-1" onClick={handleBookNow} loading={isLoading} disabled={!selectedSlotId}>
            Book now
          </Button>
        </div>
        <div className="text-center text-[11.5px] leading-relaxed text-placeholder">
          <strong className="font-bold">Book now</strong> confirms immediately — use it while the patient is on the phone.{" "}
          <strong className="font-bold">Email offer</strong> sends them a link to claim it themselves.
        </div>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
