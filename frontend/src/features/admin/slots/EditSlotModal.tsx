import { useEffect, useState } from "react";
import { useDeleteSlotMutation, useUpdateSlotMutation } from "@/features/slots/slotsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toDatetimeLocal, fromDatetimeLocal } from "@/lib/datetimeLocal";
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

  return (
    <Modal open={open} onClose={onClose} maxWidth={420}>
      <div className="font-heading mb-4 text-[17px] font-bold text-ink">Edit / block slot</div>

      <div className="mb-2 text-[13px] text-faint">
        {doctorName(slot.practitioner)} · {slot.room.name}
      </div>

      <div className="mb-3 flex gap-2.5">
        <Field label="Start" className="flex-1">
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} disabled={isBooked} />
        </Field>
        <Field label="End" className="flex-1">
          <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} disabled={isBooked} />
        </Field>
      </div>

      {isBooked ? (
        <div className="mb-5 rounded-xl bg-amber-tint px-3.5 py-3 text-[12.5px] font-semibold text-amber-ink">
          This slot is already booked by a patient — cancel the appointment first to modify it.
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
        <Button onClick={handleSave} loading={saving} disabled={isBooked}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
