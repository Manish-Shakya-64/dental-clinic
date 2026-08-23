import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreatePatientMutation, useGetPatientQuery, useUpdatePatientMutation } from "@/features/patients/patientsApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
import { NameFields } from "@/components/ui/NameFields";
import { GenderSelect } from "@/components/ui/GenderSelect";
import { collectErrors, emailError, phoneError, requiredError } from "@/lib/validators";
import { usePortalBase } from "@/lib/portalBase";
import type { Gender } from "@/types/api";

interface FormState {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: Gender | "";
  email: string;
  phone: string;
  dob: string;
  address: string;
  medical_history: string;
}

type FieldKey = "first_name" | "gender" | "email" | "phone" | "dob";
type Errors = Partial<Record<FieldKey, string>>;

const EMPTY_FORM: FormState = {
  first_name: "",
  middle_name: "",
  last_name: "",
  gender: "",
  email: "",
  phone: "",
  dob: "",
  address: "",
  medical_history: "",
};

export function PatientFormPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const isEditing = !!patientId;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const base = usePortalBase();

  const { data: existing, isLoading: loadingExisting } = useGetPatientQuery(patientId!, { skip: !isEditing });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [initialized, setInitialized] = useState(!isEditing);

  function setField<K extends FieldKey>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  const [createPatient, { isLoading: creating }] = useCreatePatientMutation();
  const [updatePatient, { isLoading: updating }] = useUpdatePatientMutation();
  const saving = creating || updating;

  useEffect(() => {
    if (isEditing && existing && !initialized) {
      setForm({
        first_name: existing.first_name,
        middle_name: existing.middle_name ?? "",
        last_name: existing.last_name ?? "",
        gender: existing.gender ?? "",
        email: existing.email,
        phone: existing.phone,
        dob: existing.dob,
        address: existing.address ?? "",
        medical_history: existing.medical_history ?? "",
      });
      setInitialized(true);
    }
  }, [isEditing, existing, initialized]);

  function validate(): Errors {
    return collectErrors<FieldKey>({
      first_name: requiredError(form.first_name, "First name"),
      gender: form.gender ? undefined : "Gender is required",
      email: emailError(form.email),
      phone: phoneError(form.phone),
      dob: isEditing ? undefined : requiredError(form.dob, "Date of birth"),
    });
  }

  async function handleSave() {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      if (isEditing) {
        await updatePatient({
          id: patientId!,
          body: {
            first_name: form.first_name,
            middle_name: form.middle_name,
            last_name: form.last_name,
            ...(form.gender ? { gender: form.gender } : {}),
            email: form.email,
            phone: form.phone,
            address: form.address,
            medical_history: form.medical_history,
          },
        }).unwrap();
        dispatch(showToast("Patient updated", "success"));
      } else {
        await createPatient({
          first_name: form.first_name,
          middle_name: form.middle_name,
          last_name: form.last_name,
          gender: form.gender as Gender,
          email: form.email,
          phone: form.phone,
          dob: form.dob,
          address: form.address,
          medical_history: form.medical_history,
        }).unwrap();
        dispatch(showToast("Patient added", "success"));
      }
      navigate(`${base}/patients`);
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  if (isEditing && (loadingExisting || !initialized)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <FadeIn>
      <button onClick={() => navigate(`${base}/patients`)} className="mb-4 text-[13px] font-bold text-faint hover:text-ink-soft">
        ← Back to patients
      </button>

      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold text-ink">{isEditing ? "Edit patient" : "Add patient"}</h2>
        {isEditing && base === "/admin" && (
          <Button variant="outline" onClick={() => navigate(`/admin/appointments?patient=${patientId}`)}>
            View appointments
          </Button>
        )}
      </div>

      {/* Grouped into who-they-are and how-we-reach-them, side by side — one long single-column
        * form leaves half the screen empty and buries medical history below the fold. */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Card>
          <div className="font-heading mb-4 text-[15px] font-bold text-ink">Personal details</div>
          <NameFields
            value={form}
            onChange={(next) => {
              setForm({ ...form, ...next });
              if (errors.first_name) setErrors((e) => ({ ...e, first_name: undefined }));
            }}
            className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3"
            firstNameError={errors.first_name}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GenderSelect value={form.gender} onChange={(g) => setField("gender", g)} error={errors.gender} />
            {!isEditing && (
              <Field label="Date of birth" error={errors.dob}>
                <Input invalid={!!errors.dob} type="date" value={form.dob} onChange={(e) => setField("dob", e.target.value)} />
              </Field>
            )}
          </div>
        </Card>

        <Card>
          <div className="font-heading mb-4 text-[15px] font-bold text-ink">Contact &amp; medical</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" error={errors.email}>
              <Input type="email" invalid={!!errors.email} value={form.email} onChange={(e) => setField("email", e.target.value)} />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <Input invalid={!!errors.phone} value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Medical history" className="sm:col-span-2">
              <Textarea
                className="h-24"
                value={form.medical_history}
                onChange={(e) => setForm({ ...form, medical_history: e.target.value })}
                placeholder="Allergies, conditions, notes…"
              />
            </Field>
          </div>
        </Card>
      </div>

      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={() => navigate(`${base}/patients`)}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Save
        </Button>
      </div>
    </FadeIn>
  );
}
