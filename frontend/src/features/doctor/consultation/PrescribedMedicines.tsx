import { useState } from "react";
import { useAddMedicineMutation } from "@/features/appointments/appointmentsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Input } from "@/components/ui/Input";
import type { Medicine } from "@/types/api";

export function PrescribedMedicines({ appointmentId, medicines }: { appointmentId: string; medicines: Medicine[] }) {
  const [draft, setDraft] = useState<Medicine>({ name: "", dosage: "", instructions: "" });
  const [showDraftRow, setShowDraftRow] = useState(false);
  const [addMedicine, { isLoading }] = useAddMedicineMutation();
  const dispatch = useAppDispatch();

  async function handleAdd() {
    if (!draft.name.trim() || !draft.dosage.trim() || !draft.instructions.trim()) return;
    try {
      await addMedicine({ id: appointmentId, medicine: draft }).unwrap();
      setDraft({ name: "", dosage: "", instructions: "" });
      setShowDraftRow(false);
      dispatch(showToast("Medicine added", "success"));
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        {medicines.map((m, i) => (
          <div key={i} className="flex gap-2 rounded-2xl bg-surface px-3.5 py-3 shadow-[4px_4px_12px_rgba(163,184,204,0.15)]">
            <div className="flex-[1.4] text-[13px] font-bold text-ink">{m.name}</div>
            <div className="flex-1 text-[13px] text-muted">{m.dosage}</div>
            <div className="flex-[1.6] text-[13px] text-muted">{m.instructions}</div>
          </div>
        ))}

        {showDraftRow && (
          <div className="flex gap-2 rounded-2xl bg-surface px-3.5 py-3 shadow-[4px_4px_12px_rgba(163,184,204,0.15)]">
            <Input
              className="flex-[1.4] border-none px-0 py-0 text-[13px] font-bold shadow-none focus:ring-0"
              placeholder="Medicine"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              autoFocus
            />
            <Input
              className="flex-1 border-none px-0 py-0 text-[13px] shadow-none focus:ring-0"
              placeholder="Dosage"
              value={draft.dosage}
              onChange={(e) => setDraft((d) => ({ ...d, dosage: e.target.value }))}
            />
            <Input
              className="flex-[1.6] border-none px-0 py-0 text-[13px] shadow-none focus:ring-0"
              placeholder="Instructions"
              value={draft.instructions}
              onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
        )}
      </div>

      {showDraftRow ? (
        <button
          onClick={handleAdd}
          disabled={isLoading}
          className="mt-2.5 text-[13px] font-bold text-primary hover:text-primary-dark disabled:opacity-50"
        >
          {isLoading ? "Saving…" : "Save medicine"}
        </button>
      ) : (
        <button onClick={() => setShowDraftRow(true)} className="mt-2.5 text-[13px] font-bold text-primary hover:text-primary-dark">
          + Add medicine
        </button>
      )}
    </div>
  );
}
