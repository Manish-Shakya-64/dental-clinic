import { useEffect, useState } from "react";
import { useCreateRoomMutation, useDeleteRoomMutation, useUpdateRoomMutation } from "@/features/rooms/roomsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Room, RoomStatus } from "@/types/api";

const STATUS_OPTIONS: { value: RoomStatus; label: string }[] = [
  { value: "AVAILABLE", label: "Available" },
  { value: "SANITIZING", label: "Sanitizing" },
  { value: "OCCUPIED", label: "Occupied" },
];

interface FormState {
  name: string;
  equipment_tags: string[];
  status: RoomStatus;
}

const EMPTY_FORM: FormState = { name: "", equipment_tags: [], status: "AVAILABLE" };

export function RoomFormModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Room | null }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newTag, setNewTag] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [createRoom, { isLoading: creating }] = useCreateRoomMutation();
  const [updateRoom, { isLoading: updating }] = useUpdateRoomMutation();
  const [deleteRoom, { isLoading: deleting }] = useDeleteRoomMutation();
  const dispatch = useAppDispatch();
  const saving = creating || updating;

  useEffect(() => {
    if (!open) return;
    setForm(editing ? { name: editing.name, equipment_tags: editing.equipment_tags, status: editing.status } : EMPTY_FORM);
    setConfirmDelete(false);
  }, [open, editing]);

  async function handleDelete() {
    if (!editing) return;
    try {
      await deleteRoom(editing._id).unwrap();
      dispatch(showToast("Room deleted", "success"));
      onClose();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  function addTag() {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    setForm((f) => ({ ...f, equipment_tags: [...f.equipment_tags, trimmed] }));
    setNewTag("");
  }

  async function handleSave() {
    try {
      if (editing) {
        await updateRoom({ id: editing._id, body: form }).unwrap();
        dispatch(showToast("Room updated", "success"));
      } else {
        await createRoom(form).unwrap();
        dispatch(showToast("Room added", "success"));
      }
      onClose();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={420}>
      <div className="font-heading mb-4 text-[17px] font-bold text-ink">{editing ? "Edit room" : "Add room"}</div>

      <Field label="Room name" className="mb-3">
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Room 4" />
      </Field>

      <div className="mb-1.5 text-xs font-bold text-ink-soft">Equipment tags</div>
      <div className="mb-3 flex flex-wrap gap-1.5 rounded-xl border border-border p-2">
        {form.equipment_tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary">
            {tag}
            <button type="button" onClick={() => setForm((f) => ({ ...f, equipment_tags: f.equipment_tags.filter((t) => t !== tag) }))} className="text-primary/60 hover:text-primary">
              ×
            </button>
          </span>
        ))}
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
          placeholder="Add tag…"
          className="min-w-[100px] flex-1 border-none bg-transparent px-1 py-1 text-xs text-ink outline-none"
        />
      </div>

      <Field label="Status" className="mb-5">
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as RoomStatus })}
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex items-center justify-between gap-2.5">
        <div>
          {editing &&
            (confirmDelete ? (
              <Button variant="dangerSolid" onClick={handleDelete} loading={deleting}>
                Confirm delete
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete room
              </Button>
            ))}
        </div>
        <div className="flex gap-2.5">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!form.name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
