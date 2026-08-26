import { useEffect, useState } from "react";
import { useLazyListPatientsQuery } from "@/features/patients/patientsApi";
import { useListTreatmentsQuery } from "@/features/treatments/treatmentsApi";
import { useListStaffQuery } from "@/features/staff/staffApi";
import { useJoinWaitlistMutation } from "@/features/waitlist/waitlistApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { fullName, staffRowName } from "@/lib/personName";
import { todayISODate } from "@/lib/bookableSlots";
import type { Patient } from "@/types/api";

const selectClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Prefilled when opened from a failed booking attempt, so reception doesn't re-enter what they
   *  just typed. */
  presetPatient?: Patient | null;
  presetTreatmentId?: string;
  presetPractitionerId?: string;
}

export function AddToWaitlistModal({ open, onClose, presetPatient, presetTreatmentId, presetPractitionerId }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [treatmentId, setTreatmentId] = useState("");
  const [practitionerId, setPractitionerId] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");

  const [searchPatients, { data: results, isFetching: searching }] = useLazyListPatientsQuery();
  const { data: treatments } = useListTreatmentsQuery();
  const { data: doctors } = useListStaffQuery({ role: "DOCTOR", is_active: true, limit: 100 });
  const [joinWaitlist, { isLoading: saving }] = useJoinWaitlistMutation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!open) return;
    setSearchTerm("");
    setPatient(presetPatient ?? null);
    setTreatmentId(presetTreatmentId ?? treatments?.[0]?._id ?? "");
    setPractitionerId(presetPractitionerId ?? "");
    setWindowStart("");
    setWindowEnd("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetPatient, presetTreatmentId, presetPractitionerId]);

  function runSearch() {
    if (!searchTerm.trim()) return;
    const isEmail = searchTerm.includes("@");
    searchPatients(isEmail ? { email: searchTerm.trim() } : { phone: searchTerm.trim() });
  }

  async function handleSave() {
    if (!patient || !treatmentId) return;
    try {
      await joinWaitlist({
        patientId: patient._id,
        treatmentId,
        ...(practitionerId ? { preferredPractitionerId: practitionerId } : {}),
        // Dates only — the window is a rough "any time between these days", not a precise slot.
        ...(windowStart ? { preferredWindowStart: new Date(`${windowStart}T00:00:00`).toISOString() } : {}),
        ...(windowEnd ? { preferredWindowEnd: new Date(`${windowEnd}T23:59:59`).toISOString() } : {}),
      }).unwrap();
      dispatch(showToast(`${fullName(patient)} added to the waitlist`, "success"));
      onClose();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  const windowInvalid = !!windowStart && !!windowEnd && windowEnd < windowStart;
  const canSave = !!patient && !!treatmentId && !windowInvalid;

  return (
    <Modal open={open} onClose={onClose} maxWidth={480}>
      <div className="font-heading mb-1 text-lg font-bold text-ink">Add to waitlist</div>
      <div className="mb-4 text-[13px] text-faint">
        We&apos;ll email them automatically when a matching appointment is cancelled or rescheduled.
      </div>

      {patient ? (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-surface-alt px-3.5 py-2.5">
          <div className="min-w-0 text-[13.5px]">
            <span className="font-bold text-ink">{fullName(patient)}</span>
            <span className="ml-1.5 truncate text-faint">· {patient.email}</span>
          </div>
          {!presetPatient && (
            <button onClick={() => setPatient(null)} className="ml-3 shrink-0 text-[12.5px] font-bold text-primary">
              Change
            </button>
          )}
        </div>
      ) : (
        <Field label="Find patient" className="mb-3">
          <div className="flex gap-2.5">
            <Input
              placeholder="Search by email or phone…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <Button variant="secondary" onClick={runSearch} loading={searching}>
              Search
            </Button>
          </div>
          {results && results.data.length > 0 && (
            <div className="mt-2 flex max-h-40 flex-col gap-1.5 overflow-y-auto">
              {results.data.map((p) => (
                <button
                  key={p._id}
                  onClick={() => setPatient(p)}
                  className="rounded-xl border border-border px-3.5 py-2.5 text-left text-[13.5px] hover:bg-surface-alt"
                >
                  <span className="font-bold text-ink">{fullName(p)}</span>
                  <span className="ml-1.5 text-faint">· {p.email}</span>
                </button>
              ))}
            </div>
          )}
          {results && results.data.length === 0 && !searching && (
            <div className="mt-2 text-[12.5px] text-faint">No patient found. Add them under Patients first.</div>
          )}
        </Field>
      )}

      <Field label="Treatment" className="mb-3">
        <select value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)} className={selectClass}>
          {treatments?.map((t) => (
            <option key={t._id} value={t._id}>
              {t.label} · {t.default_duration_mins} min
            </option>
          ))}
        </select>
      </Field>

      <Field label="Preferred dentist" className="mb-3">
        <select value={practitionerId} onChange={(e) => setPractitionerId(e.target.value)} className={selectClass}>
          <option value="">No preference (offered sooner)</option>
          {doctors?.data.map((d) => (
            <option key={d.practitionerId} value={d.practitionerId}>
              {staffRowName(d)}
            </option>
          ))}
        </select>
      </Field>

      <div className="mb-1 text-xs font-bold text-ink-soft">Preferred dates (optional)</div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Field label="From" className="min-w-0">
          <Input type="date" min={todayISODate()} value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
        </Field>
        <Field label="To" className="min-w-0" error={windowInvalid ? "Must be after the from date" : undefined}>
          <Input type="date" min={windowStart || todayISODate()} invalid={windowInvalid} value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
        </Field>
      </div>
      <div className="mt-1 text-[11.5px] leading-relaxed text-placeholder">
        Leave blank to accept any date. Narrowing the window means fewer offers.
      </div>

      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving} disabled={!canSave}>
          Add to waitlist
        </Button>
      </div>
    </Modal>
  );
}
