import { useEffect, useState } from "react";
import { useCreateSlotMutation } from "@/features/slots/slotsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { toDatetimeLocal, fromDatetimeLocal } from "@/lib/datetimeLocal";
import { staffRowName } from "@/lib/personName";
import type { Room, StaffRow } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
  doctors: StaffRow[];
  rooms: Room[];
  defaultDoctorId: string;
  defaultStart: Date;
}

export function AddSlotModal({ open, onClose, doctors, rooms, defaultDoctorId, defaultStart }: Props) {
  const [practitionerId, setPractitionerId] = useState(defaultDoctorId);
  const [roomId, setRoomId] = useState(rooms[0]?._id ?? "");
  const [start, setStart] = useState(toDatetimeLocal(defaultStart));
  const [end, setEnd] = useState(toDatetimeLocal(new Date(defaultStart.getTime() + 30 * 60_000)));
  const [repeat, setRepeat] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(4);
  const [createSlot, { isLoading }] = useCreateSlotMutation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!open) return;
    setPractitionerId(defaultDoctorId);
    setRoomId(rooms[0]?._id ?? "");
    setStart(toDatetimeLocal(defaultStart));
    setEnd(toDatetimeLocal(new Date(defaultStart.getTime() + 30 * 60_000)));
    setRepeat(false);
    setRepeatWeeks(4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDoctorId, defaultStart]);

  async function handleSave() {
    try {
      await createSlot({
        practitionerId,
        roomId,
        startTime: fromDatetimeLocal(start).toISOString(),
        endTime: fromDatetimeLocal(end).toISOString(),
        repeatWeeks: repeat ? repeatWeeks : undefined,
      }).unwrap();
      dispatch(showToast(repeat ? `${repeatWeeks} slots created` : "Slot created", "success"));
      onClose();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  const canSave = practitionerId && roomId && start && end && fromDatetimeLocal(end) > fromDatetimeLocal(start);

  return (
    <Modal open={open} onClose={onClose} maxWidth={420}>
      <div className="font-heading mb-4 text-[17px] font-bold text-ink">Add slot</div>

      <Field label="Dentist" className="mb-3">
        <select
          value={practitionerId}
          onChange={(e) => setPractitionerId(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {doctors.map((d) => (
            <option key={d.practitionerId} value={d.practitionerId}>
              {staffRowName(d)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Room" className="mb-3">
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {rooms.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="mb-3 flex gap-2.5">
        <Field label="Start" className="flex-1">
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="End" className="flex-1">
          <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>

      <div className="flex items-center justify-between py-2.5">
        <div className="text-[13px] font-semibold text-ink-soft">Repeat weekly</div>
        <Toggle checked={repeat} onChange={() => setRepeat((r) => !r)} />
      </div>
      {repeat && (
        <Field label="Number of weeks" className="mb-3">
          <Input type="number" min={1} max={52} value={repeatWeeks} onChange={(e) => setRepeatWeeks(Number(e.target.value))} />
        </Field>
      )}

      <div className="mt-3 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={isLoading} disabled={!canSave}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
