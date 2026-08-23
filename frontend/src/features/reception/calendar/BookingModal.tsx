import { useEffect, useState } from "react";
import { useLazyListPatientsQuery, useCreatePatientMutation } from "@/features/patients/patientsApi";
import { useListTreatmentsQuery } from "@/features/treatments/treatmentsApi";
import { useListRoomsQuery } from "@/features/rooms/roomsApi";
import { useCreateAppointmentMutation } from "@/features/appointments/appointmentsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { cn } from "@/lib/cn";
import { toDatetimeLocal, fromDatetimeLocal } from "@/lib/datetimeLocal";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { NameFields } from "@/components/ui/NameFields";
import { GenderSelect } from "@/components/ui/GenderSelect";
import { fullName, staffRowName } from "@/lib/personName";
import { collectErrors, emailError, phoneError, requiredError } from "@/lib/validators";
import type { Gender, Patient, StaffRow } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
  doctors: StaffRow[];
  defaultDate: Date;
}

interface NewPatientForm {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: Gender | "";
  email: string;
  phone: string;
  dob: string;
}

const EMPTY_NEW_PATIENT: NewPatientForm = { first_name: "", middle_name: "", last_name: "", gender: "", email: "", phone: "", dob: "" };

type NewPatientFieldKey = "first_name" | "gender" | "email" | "phone" | "dob";
type NewPatientErrors = Partial<Record<NewPatientFieldKey, string>>;

export function BookingModal({ open, onClose, doctors, defaultDate }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPatients, { data: searchResults, isFetching: searching }] = useLazyListPatientsQuery();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [addingNewPatient, setAddingNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState<NewPatientForm>(EMPTY_NEW_PATIENT);
  const [newPatientErrors, setNewPatientErrors] = useState<NewPatientErrors>({});

  function setNewPatientField<K extends NewPatientFieldKey>(key: K, value: NewPatientForm[K]) {
    setNewPatient((p) => ({ ...p, [key]: value }));
    setNewPatientErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  const { data: treatments } = useListTreatmentsQuery();
  const { data: rooms } = useListRoomsQuery();

  const [treatmentId, setTreatmentId] = useState("");
  const [practitionerId, setPractitionerId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [startTime, setStartTime] = useState("");

  const [createPatient, { isLoading: creatingPatient }] = useCreatePatientMutation();
  const [createAppointment, { isLoading: booking }] = useCreateAppointmentMutation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!open) return;
    setSearchTerm("");
    setSelectedPatient(null);
    setAddingNewPatient(false);
    setNewPatient(EMPTY_NEW_PATIENT);
    setNewPatientErrors({});
    setTreatmentId((prev) => prev || treatments?.[0]?._id || "");
    setPractitionerId(doctors[0]?.practitionerId ?? "");
    setRoomId((prev) => prev || rooms?.[0]?._id || "");
    const start = new Date(defaultDate);
    if (start.getHours() === 0) start.setHours(9, 0, 0, 0);
    setStartTime(toDatetimeLocal(start));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate]);

  function runSearch() {
    if (!searchTerm.trim()) return;
    const isEmail = searchTerm.includes("@");
    searchPatients(isEmail ? { email: searchTerm.trim() } : { phone: searchTerm.trim() });
  }

  function validateNewPatient(): NewPatientErrors {
    return collectErrors<NewPatientFieldKey>({
      first_name: requiredError(newPatient.first_name, "First name"),
      gender: newPatient.gender ? undefined : "Gender is required",
      email: emailError(newPatient.email),
      phone: phoneError(newPatient.phone),
      dob: requiredError(newPatient.dob, "Date of birth"),
    });
  }

  async function handleSave() {
    if (addingNewPatient) {
      const validationErrors = validateNewPatient();
      setNewPatientErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) return;
    }

    try {
      let patientId = selectedPatient?._id;

      if (addingNewPatient) {
        const created = await createPatient({
          first_name: newPatient.first_name,
          middle_name: newPatient.middle_name,
          last_name: newPatient.last_name,
          gender: newPatient.gender as Gender,
          email: newPatient.email,
          phone: newPatient.phone,
          dob: newPatient.dob,
        }).unwrap();
        patientId = created._id;
      }
      if (!patientId) return;

      await createAppointment({
        patientId,
        practitionerId,
        roomId,
        treatmentId,
        startTime: fromDatetimeLocal(startTime).toISOString(),
      }).unwrap();

      dispatch(showToast("Appointment booked", "success"));
      onClose();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  const patientReady = addingNewPatient ? true : !!selectedPatient;
  const canSave = patientReady && practitionerId && roomId && treatmentId && startTime;

  return (
    <Modal open={open} onClose={onClose} maxWidth={480}>
      <div className="font-heading mb-4 text-lg font-bold text-ink">New booking</div>

      {!addingNewPatient ? (
        <>
          <Field label="Find patient">
            <div className="flex gap-2">
              <Input
                placeholder="Search by email or phone…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runSearch())}
              />
              <Button variant="secondary" onClick={runSearch} loading={searching}>
                Search
              </Button>
            </div>
          </Field>

          {searchResults && (
            <div className="mt-2 flex max-h-36 flex-col gap-1.5 overflow-y-auto">
              {searchResults.data.length === 0 ? (
                <div className="px-1 py-2 text-xs text-faint">No matches. Try a new patient instead.</div>
              ) : (
                searchResults.data.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => setSelectedPatient(p)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-[13px]",
                      selectedPatient?._id === p._id ? "border-primary bg-primary-tint" : "border-border bg-surface",
                    )}
                  >
                    <span className="font-bold text-ink">{fullName(p)}</span>{" "}
                    <span className="text-faint">· {p.email}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedPatient && (
            <div className="mt-2 rounded-xl bg-teal-tint px-3 py-2 text-[13px] font-semibold text-[#2E7A6C]">
              Selected: {fullName(selectedPatient)}
            </div>
          )}

          <button type="button" onClick={() => setAddingNewPatient(true)} className="mt-2 text-[13px] font-bold text-primary">
            + New patient instead
          </button>
        </>
      ) : (
        <>
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-xs font-bold text-ink-soft">New patient details</div>
            <button type="button" onClick={() => setAddingNewPatient(false)} className="text-xs font-bold text-primary">
              Search existing instead
            </button>
          </div>
          <NameFields
            value={newPatient}
            onChange={(next) => {
              setNewPatient({ ...newPatient, ...next });
              if (newPatientErrors.first_name) setNewPatientErrors((e) => ({ ...e, first_name: undefined }));
            }}
            className="mb-3 grid grid-cols-2 gap-3"
            firstNameError={newPatientErrors.first_name}
          />
          <div className="grid grid-cols-2 gap-3">
            <GenderSelect value={newPatient.gender} onChange={(g) => setNewPatientField("gender", g)} error={newPatientErrors.gender} />
            <Field label="Email" error={newPatientErrors.email}>
              <Input
                type="email"
                invalid={!!newPatientErrors.email}
                value={newPatient.email}
                onChange={(e) => setNewPatientField("email", e.target.value)}
              />
            </Field>
            <Field label="Phone" error={newPatientErrors.phone}>
              <Input
                invalid={!!newPatientErrors.phone}
                value={newPatient.phone}
                onChange={(e) => setNewPatientField("phone", e.target.value)}
              />
            </Field>
            <Field label="Date of birth" error={newPatientErrors.dob}>
              <Input
                invalid={!!newPatientErrors.dob}
                type="date"
                value={newPatient.dob}
                onChange={(e) => setNewPatientField("dob", e.target.value)}
              />
            </Field>
          </div>
        </>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Treatment" className="col-span-2">
          <select
            value={treatmentId}
            onChange={(e) => setTreatmentId(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {treatments?.map((t) => (
              <option key={t._id} value={t._id}>
                {t.label} · {t.default_duration_mins} min
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dentist">
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
        <Field label="Room">
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {rooms?.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date & time" className="col-span-2">
          <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={booking || creatingPatient} disabled={!canSave}>
          Book appointment
        </Button>
      </div>
    </Modal>
  );
}
