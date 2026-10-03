import { useEffect, useState } from "react";
import { useCreateTreatmentMutation, useUpdateTreatmentMutation } from "@/features/treatments/treatmentsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Treatment } from "@/types/api";

interface FormState {
  label: string;
  default_duration_mins: string;
  buffer_after_mins: string;
  price: string;
}

const EMPTY_FORM: FormState = { label: "", default_duration_mins: "45", buffer_after_mins: "15", price: "" };

export function TreatmentFormModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Treatment | null }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [createTreatment, { isLoading: creating }] = useCreateTreatmentMutation();
  const [updateTreatment, { isLoading: updating }] = useUpdateTreatmentMutation();
  const dispatch = useAppDispatch();
  const saving = creating || updating;

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            label: editing.label,
            default_duration_mins: String(editing.default_duration_mins),
            buffer_after_mins: String(editing.buffer_after_mins),
            price: String(editing.price),
          }
        : EMPTY_FORM,
    );
  }, [open, editing]);

  async function handleSave() {
    const body = {
      label: form.label,
      default_duration_mins: Number(form.default_duration_mins),
      buffer_after_mins: Number(form.buffer_after_mins),
      price: Number(form.price),
    };
    try {
      if (editing) {
        await updateTreatment({ id: editing._id, body }).unwrap();
        dispatch(showToast("Treatment updated", "success"));
      } else {
        await createTreatment(body).unwrap();
        dispatch(showToast("Treatment added", "success"));
      }
      onClose();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  const canSave = form.label.trim() && Number(form.default_duration_mins) > 0 && Number(form.price) >= 0;

  return (
    <Modal open={open} onClose={onClose} maxWidth={420}>
      <div className="font-heading mb-4 text-[17px] font-bold text-ink">{editing ? "Edit treatment" : "Add treatment type"}</div>

      <Field label="Name" className="mb-3">
        <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Check-up & Clean" />
      </Field>

      <div className="mb-3 flex gap-2.5">
        <Field label="Default duration (min)" className="flex-1">
          <Input type="number" min={1} value={form.default_duration_mins} onChange={(e) => setForm({ ...form, default_duration_mins: e.target.value })} />
        </Field>
        <Field label="Buffer after (min)" className="flex-1">
          <Input type="number" min={0} value={form.buffer_after_mins} onChange={(e) => setForm({ ...form, buffer_after_mins: e.target.value })} />
        </Field>
      </div>

      <Field label="Price (AUD)" className="mb-1.5">
        <Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="180.00" />
      </Field>
      <div className="mb-5 text-[11.5px] leading-relaxed text-placeholder">This sets the reference fee shown on bills, not a payment processor.</div>

      <div className="flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving} disabled={!canSave}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
