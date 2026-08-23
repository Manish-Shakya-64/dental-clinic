import { useEffect, useState } from "react";
import { useAddClinicalNoteMutation } from "@/features/appointments/appointmentsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ConsultationNotePanel({ appointmentId, initialNote }: { appointmentId: string; initialNote: string }) {
  const [note, setNote] = useState(initialNote);
  const [addNote, { isLoading }] = useAddClinicalNoteMutation();
  const dispatch = useAppDispatch();

  useEffect(() => setNote(initialNote), [initialNote]);

  async function handleSave() {
    if (!note.trim()) return;
    try {
      await addNote({ id: appointmentId, noteText: note }).unwrap();
      dispatch(showToast("Consultation note saved", "success"));
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  const dirty = note !== initialNote;

  return (
    <Card>
      <Textarea
        placeholder="Clinical findings, treatment performed, follow-up recommendations…"
        className="h-28 border-none px-0 shadow-none focus:ring-0"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="mt-3 flex justify-end">
        <Button variant="outline" onClick={handleSave} loading={isLoading} disabled={!dirty || !note.trim()}>
          Save note
        </Button>
      </div>
    </Card>
  );
}
