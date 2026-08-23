import { useEffect, useRef, useState } from "react";
import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useLazyGetMyProfileImageQuery,
  useUploadProfileImageMutation,
  useDeleteProfileImageMutation,
} from "@/features/profile/profileApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
import { NameFields } from "@/components/ui/NameFields";
import { GenderSelect } from "@/components/ui/GenderSelect";
import { WorkingHoursEditor } from "@/features/doctor/profile/WorkingHoursEditor";
import { collectErrors, emailError, phoneError, requiredError } from "@/lib/validators";
import type { Gender, Practitioner, WorkingHours } from "@/types/api";

interface FormState {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: Gender | "";
  email: string;
  phone: string;
  specialties: string[];
  working_hours: WorkingHours;
}

type FieldKey = "first_name" | "gender" | "email" | "phone";
type Errors = Partial<Record<FieldKey, string>>;

function Avatar({ hasImage }: { hasImage: boolean }) {
  const [triggerImage, { data: blob }] = useLazyGetMyProfileImageQuery();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (hasImage) void triggerImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImage]);

  useEffect(() => {
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [blob]);

  return url ? (
    <img src={url} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
  ) : (
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-tint text-2xl font-bold text-primary">?</div>
  );
}

export function ProfilePage() {
  const { data, isLoading } = useGetMyProfileQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateMyProfileMutation();
  const [uploadImage, { isLoading: uploading }] = useUploadProfileImageMutation();
  const [deleteImage, { isLoading: deletingImage }] = useDeleteProfileImageMutation();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const initialized = useRef(false);

  function setField<K extends FieldKey>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  useEffect(() => {
    if (data && !initialized.current) {
      initialized.current = true;
      const profile = data.profile as Practitioner;
      setForm({
        first_name: profile.first_name,
        middle_name: profile.middle_name ?? "",
        last_name: profile.last_name ?? "",
        gender: profile.gender ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        specialties: profile.specialties,
        working_hours: profile.working_hours,
      });
    }
  }, [data]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadImage(file).unwrap();
      dispatch(showToast("Profile photo updated", "success"));
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    } finally {
      e.target.value = "";
    }
  }

  async function handleRemoveImage() {
    try {
      await deleteImage().unwrap();
      dispatch(showToast("Profile photo removed", "success"));
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  function addSpecialty() {
    const trimmed = newSpecialty.trim();
    if (!trimmed || !form) return;
    setForm({ ...form, specialties: [...form.specialties, trimmed] });
    setNewSpecialty("");
  }

  function removeSpecialty(specialty: string) {
    if (!form) return;
    setForm({ ...form, specialties: form.specialties.filter((s) => s !== specialty) });
  }

  function validate(f: FormState): Errors {
    return collectErrors<FieldKey>({
      first_name: requiredError(f.first_name, "First name"),
      gender: f.gender ? undefined : "Gender is required",
      email: emailError(f.email),
      phone: phoneError(f.phone),
    });
  }

  async function handleSave() {
    if (!form) return;
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await updateProfile({
        first_name: form.first_name,
        middle_name: form.middle_name,
        last_name: form.last_name,
        ...(form.gender ? { gender: form.gender } : {}),
        email: form.email,
        phone: form.phone,
        specialties: form.specialties,
        working_hours: form.working_hours,
      }).unwrap();
      dispatch(showToast("Profile updated", "success"));
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  const profile = data?.profile as Practitioner | undefined;

  if (isLoading || !form) {
    return (
      <div className="flex gap-6">
        <Skeleton className="h-80 flex-1 rounded-2xl" />
        <Skeleton className="h-80 flex-1 rounded-2xl" />
      </div>
    );
  }

  return (
    <FadeIn>
      <Card className="mb-6">
        <div className="flex items-center gap-5">
          <Avatar hasImage={!!profile?.profile_image} />
          <div>
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} loading={uploading}>
                {profile?.profile_image ? "Change photo" : "Upload photo"}
              </Button>
              {profile?.profile_image && (
                <Button variant="ghost" onClick={handleRemoveImage} loading={deletingImage}>
                  Remove
                </Button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            <div className="mt-2 text-xs text-faint">JPG, PNG, or WEBP</div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="flex-1">
          <NameFields
            value={form}
            onChange={(next) => {
              setForm({ ...form, ...next });
              if (errors.first_name) setErrors((e) => ({ ...e, first_name: undefined }));
            }}
            className="mb-3.5 grid-cols-1 sm:grid-cols-3"
            firstNameError={errors.first_name}
          />
          <GenderSelect value={form.gender} onChange={(g) => setField("gender", g)} className="mb-3.5" error={errors.gender} />
          <Field label="Email" className="mb-3.5" error={errors.email}>
            <Input type="email" invalid={!!errors.email} value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </Field>
          <Field label="Phone" className="mb-3.5" error={errors.phone}>
            <Input invalid={!!errors.phone} value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </Field>
          <div className="mb-1.5 text-xs font-bold text-ink-soft">Specialties</div>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-border p-2">
            {form.specialties.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary">
                {s}
                <button type="button" onClick={() => removeSpecialty(s)} className="text-primary/60 hover:text-primary">
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
        </Card>

        <Card className="flex-1">
          <div className="font-heading mb-3.5 text-[14.5px] font-bold text-ink">Working hours</div>
          <WorkingHoursEditor value={form.working_hours} onChange={(wh) => setForm({ ...form, working_hours: wh })} />
        </Card>
      </div>

      <Button className="mt-6" loading={saving} onClick={handleSave}>
        Save changes
      </Button>
    </FadeIn>
  );
}
