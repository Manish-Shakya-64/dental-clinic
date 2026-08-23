import { useMemo, useState } from "react";
import { useListSlotsQuery } from "@/features/slots/slotsApi";
import { useOfferSlotMutation } from "@/features/waitlist/waitlistApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/lib/dateTime";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { doctorName, fullName } from "@/lib/personName";
import type { Waitlist } from "@/types/api";

export function OfferSlotModal({ open, onClose, entry }: { open: boolean; onClose: () => void; entry: Waitlist | null }) {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [offerSlot, { isLoading }] = useOfferSlotMutation();
  const dispatch = useAppDispatch();

  const { data: slots, isLoading: loadingSlots } = useListSlotsQuery(
    { practitioner: entry?.preferred_practitioner?._id, status: "OPEN" },
    { skip: !open || !entry },
  );

  const sorted = useMemo(() => [...(slots ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time)), [slots]);

  async function handleConfirm() {
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
        <div className="rounded-xl bg-surface-alt px-4 py-6 text-center text-sm text-faint">No open slots available right now.</div>
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

      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} loading={isLoading} disabled={!selectedSlotId}>
          Offer this slot
        </Button>
      </div>
    </Modal>
  );
}
