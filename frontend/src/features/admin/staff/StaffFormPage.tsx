import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateStaffMutation, useListStaffQuery, useUpdateStaffMutation } from "@/features/staff/staffApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
import { WorkingHoursEditor } from "@/features/doctor/profile/WorkingHoursEditor";
import { NameFields } from "@/components/ui/NameFields";
import { GenderSelect } from "@/components/ui/GenderSelect";
import { collectErrors, confirmPasswordError, emailError, passwordError, requiredError } from "@/lib/validators";
import type { Gender, Role, WorkingHours } from "@/types/api";

const ROLE_TABS: { role: Role; label: string }[] = [
  { role: "DOCTOR", label: "Doctor" },
  { role: "RECEPTIONIST", label: "Receptionist" },
  { role: "ADMIN", label: "Admin" },
];

interface FormState {
  role: Role;
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: Gender | "";
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  specialties: string[];
  working_hours: WorkingHours;
}

type FieldKey = "first_name" | "gender" | "email" | "phone" | "password" | "confirmPassword";
type Errors = Partial<Record<FieldKey, string>>;

const EMPTY_FORM: FormState = {
  role: "DOCTOR",
  first_name: "",
  middle_name: "",
  last_name: "",
  gender: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  specialties: [],
  working_hours: {},
};

export function StaffFormPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const isEditing = !!staffId;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { data: staffList, isLoading: listLoading } = useListStaffQuery({ limit: 200 }, { skip: !isEditing });
  const editing = isEditing ? staffList?.data.find((s) => s.id === staffId) : undefined;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [initialized, setInitialized] = useState(!isEditing);
  const [newSpecialty, setNewSpecialty] = useState("");

  function setField<K extends FieldKey>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }
  const [createStaff, { isLoading: creating }] = useCreateStaffMutation();
  const [updateStaff, { isLoading: updating }] = useUpdateStaffMutation();
  const saving = creating || updating;

  useEffect(() => {
    if (isEditing && editing && !initialized) {
      setForm({
        role: editing.role,
        first_name: editing.first_name,
        middle_name: editing.middle_name ?? "",
        last_name: editing.last_name ?? "",
        gender: editing.gender ?? "",
        email: editing.email,
        phone: editing.phone ?? "",
        password: "",
        confirmPassword: "",
        specialties: editing.specialties ?? [],
        working_hours: editing.working_hours ?? {},
      });
      setInitialized(true);
    }
  }, [isEditing, editing, initialized]);

  function addSpecialty() {
    const trimmed = newSpecialty.trim();
    if (!trimmed) return;
    setForm((f) => ({ ...f, specialties: [...f.specialties, trimmed] }));
    setNewSpecialty("");
  }

  function validate(): Errors {
    return collectErrors<FieldKey>({
      first_name: requiredError(form.first_name, "First name"),
      gender: form.gender ? undefined : "Gender is required",
      email: emailError(form.email),
      phone: undefined,
      password: isEditing ? undefined : passwordError(form.password),
      confirmPassword: isEditing ? undefined : confirmPasswordError(form.password, form.confirmPassword),
    });
  }

  async function handleSave() {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      if (isEditing) {
        await updateStaff({
          id: staffId!,
          body: {
            first_name: form.first_name,
            middle_name: form.middle_name,
            last_name: form.last_name,
            ...(form.gender ? { gender: form.gender } : {}),
            email: form.email,
            phone: form.phone,
            ...(form.role === "DOCTOR" ? { specialties: form.specialties, working_hours: form.working_hours } : {}),
          },
        }).unwrap();
        dispatch(showToast("Staff member updated", "success"));
      } else {
        await createStaff({
          first_name: form.first_name,
          middle_name: form.middle_name,
          last_name: form.last_name,
          gender: form.gender as Gender,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          ...(form.role === "DOCTOR" ? { specialties: form.specialties, working_hours: form.working_hours } : {}),
        }).unwrap();
        dispatch(showToast("Staff member added", "success"));
      }
      navigate("/admin/staff");
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  if (isEditing && (listLoading || !initialized)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isEditing && !editing) {
    return <div className="rounded-2xl bg-surface px-5 py-8 text-center text-sm text-faint">Staff member not found.</div>;
  }

  return (
    <FadeIn className="mx-auto max-w-3xl">
      <button onClick={() => navigate("/admin/staff")} className="mb-4 text-[13px] font-bold text-faint hover:text-ink-soft">
        ← Back to staff
      </button>

      <h2 className="font-heading mb-5 text-lg font-bold text-ink">{isEditing ? "Edit staff member" : "Add staff member"}</h2>

      <Card>
        {!isEditing && (
          <div className="mb-5 flex gap-2">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.role}
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: tab.role }))}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-colors",
                  form.role === tab.role ? "bg-primary text-white" : "bg-surface-alt text-muted",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <NameFields
          value={form}
          onChange={(next) => {
            setForm({ ...form, ...next });
            if (errors.first_name) setErrors((e) => ({ ...e, first_name: undefined }));
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          firstNameError={errors.first_name}
        />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GenderSelect value={form.gender} onChange={(g) => setField("gender", g)} error={errors.gender} />
          <Field label="Email" error={errors.email}>
            <Input type="email" invalid={!!errors.email} value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          {!isEditing && (
            <>
              <Field label="Password" error={errors.password}>
                <PasswordInput
                  invalid={!!errors.password}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Min. 8 characters"
                />
              </Field>
              <Field label="Confirm password" error={errors.confirmPassword}>
                <PasswordInput
                  invalid={!!errors.confirmPassword}
                  value={form.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  placeholder="Re-enter password"
                />
              </Field>
            </>
          )}
        </div>

        {form.role === "DOCTOR" && (
          <div className="mt-4">
            <div className="mb-1.5 text-xs font-bold text-ink-soft">Specialties</div>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-border p-2">
              {form.specialties.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary">
                  {s}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, specialties: f.specialties.filter((x) => x !== s) }))} className="text-primary/60 hover:text-primary">
                    ×
                  </button>
                </span>
              ))}
              <input
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpecialty())}
                placeholder="Add specialty…"
                className="min-w-[100px] flex-1 border-none bg-transparent px-1 py-1 text-xs text-ink outline-none"
              />
            </div>
          </div>
        )}
      </Card>

      {form.role === "DOCTOR" && (
        <Card className="mt-5">
          <div className="font-heading mb-3.5 text-[14.5px] font-bold text-ink">Working hours</div>
          <WorkingHoursEditor value={form.working_hours} onChange={(wh) => setForm((f) => ({ ...f, working_hours: wh }))} />
        </Card>
      )}

      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="ghost" onClick={() => navigate("/admin/staff")}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Save
        </Button>
      </div>
    </FadeIn>
  );
}
