import { useEffect, useState } from "react";
import { useDeleteSlotMutation, useUpdateSlotMutation } from "@/features/slots/slotsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toDatetimeLocal, fromDatetimeLocal } from "@/lib/datetimeLocal";
import { nowISOMinute } from "@/lib/bookableSlots";
import { doctorName } from "@/lib/personName";
import type { Slot } from "@/types/api";

export function EditSlotModal({ open, onClose, slot }: { open: boolean; onClose: () => void; slot: Slot | null }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [updateSlot, { isLoading: saving }] = useUpdateSlotMutation();
  const [deleteSlot, { isLoading: deleting }] = useDeleteSlotMutation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!open || !slot) return;
    setStart(toDatetimeLocal(new Date(slot.start_time)));
    setEnd(toDatetimeLocal(new Date(slot.end_time)));
    setConfirmDelete(false);
  }, [open, slot]);

  if (!slot) return null;

  async function handleSave() {
    try {
      await updateSlot({ id: slot!._id, body: { startTime: fromDatetimeLocal(start).toISOString(), endTime: fromDatetimeLocal(end).toISOString() } }).unwrap();
      dispatch(showToast("Slot updated", "success"));
      onClose();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  async function toggleBlock() {
    try {
      await updateSlot({ id: slot!._id, body: { status: slot!.status === "BLOCKED" ? "OPEN" : "BLOCKED" } }).unwrap();
      dispatch(showToast(slot!.status === "BLOCKED" ? "Slot unblocked" : "Slot blocked", "success"));
      onClose();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  async function handleDelete() {
    try {
      await deleteSlot(slot!._id).unwrap();
      dispatch(showToast("Slot deleted", "success"));
      onClose();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  const isBooked = slot.status === "BOOKED";
  // A slot whose time has gone can't be re-timed — the API rejects any past start — but it can
  // still be deleted, so stale rows don't become permanently stuck.
  const isPast = new Date(slot.start_time).getTime() <= Date.now();
  const locked = isBooked || isPast;

  const rangeError = (() => {
    if (!start || !end) return undefined;
    const from = fromDatetimeLocal(start);
    const to = fromDatetimeLocal(end);
    if (to <= from) return "End must be after start";
    const minutes = (to.getTime() - from.getTime()) / 60_000;
    if (minutes < 5) return "A slot must be at least 5 minutes";
    if (minutes > 24 * 60) return "A slot can't be longer than 24 hours";
    return undefined;
  })();

  return (
    <Modal open={open} onClose={onClose} maxWidth={520}>
      <div className="font-heading mb-4 text-[17px] font-bold text-ink">Edit / block slot</div>

      <div className="mb-2 text-[13px] text-faint">
        {doctorName(slot.practitioner)} · {slot.room.name}
      </div>

      {/* See AddSlotModal — min-w-0 keeps the datetime-local inputs inside the modal. */}
      <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Field label="Start" className="min-w-0" error={rangeError}>
          <Input type="datetime-local" min={nowISOMinute()} invalid={!!rangeError} value={start} onChange={(e) => setStart(e.target.value)} disabled={locked} />
        </Field>
        <Field label="End" className="min-w-0">
          <Input type="datetime-local" min={start || nowISOMinute()} invalid={!!rangeError} value={end} onChange={(e) => setEnd(e.target.value)} disabled={locked} />
        </Field>
      </div>

      {isBooked ? (
        <div className="mb-5 rounded-xl bg-amber-tint px-3.5 py-3 text-[12.5px] font-semibold text-amber-ink">
          This slot is already booked by a patient — cancel the appointment first to modify it.
        </div>
      ) : isPast ? (
        <div className="mb-5">
          <div className="mb-3 rounded-xl bg-surface-alt px-3.5 py-3 text-[12.5px] font-semibold text-muted">
            This time has already passed, so it can no longer be changed or booked. You can still remove it.
          </div>
          {confirmDelete ? (
            <Button variant="dangerSolid" fullWidth onClick={handleDelete} loading={deleting}>
              Confirm delete
            </Button>
          ) : (
            <Button variant="danger" fullWidth onClick={() => setConfirmDelete(true)}>
              Delete slot
            </Button>
          )}
        </div>
      ) : (
        <div className="mb-5 flex gap-2.5">
          <Button variant="outline" className="flex-1" onClick={toggleBlock}>
            {slot.status === "BLOCKED" ? "Unblock this slot" : "Block this slot"}
          </Button>
          {confirmDelete ? (
            <Button variant="dangerSolid" className="flex-1" onClick={handleDelete} loading={deleting}>
              Confirm delete
            </Button>
          ) : (
            <Button variant="danger" className="flex-1" onClick={() => setConfirmDelete(true)}>
              Delete slot
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving} disabled={locked || !!rangeError}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
