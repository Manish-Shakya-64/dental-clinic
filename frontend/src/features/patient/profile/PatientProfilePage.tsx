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
import { formatDate } from "@/lib/dateTime";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn } from "@/components/ui/FadeIn";
import { NameFields } from "@/components/ui/NameFields";
import { GenderSelect } from "@/components/ui/GenderSelect";
import { collectErrors, emailError, phoneError, requiredError } from "@/lib/validators";
import type { Gender, Patient } from "@/types/api";

interface FormState {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: Gender | "";
  email: string;
  phone: string;
  address: string;
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

export function PatientProfilePage() {
  const { data, isLoading } = useGetMyProfileQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateMyProfileMutation();
  const [uploadImage, { isLoading: uploading }] = useUploadProfileImageMutation();
  const [deleteImage, { isLoading: deletingImage }] = useDeleteProfileImageMutation();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const initialized = useRef(false);

  function setField<K extends FieldKey>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  useEffect(() => {
    if (data && !initialized.current) {
      initialized.current = true;
      const profile = data.profile as Patient;
      setForm({
        first_name: profile.first_name,
        middle_name: profile.middle_name ?? "",
        last_name: profile.last_name ?? "",
        gender: profile.gender ?? "",
        email: profile.email,
        phone: profile.phone,
        address: profile.address ?? "",
      });
    }
  }, [data]);

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
        address: form.address,
      }).unwrap();
      dispatch(showToast("Profile updated", "success"));
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

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

  if (isLoading || !form || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const patient = data.profile as Patient;

  return (
    <FadeIn className="mx-auto max-w-4xl">
      <Card className="mb-5">
        <div className="flex items-center gap-5">
          <Avatar hasImage={!!patient.profile_image} />
          <div>
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} loading={uploading}>
                {patient.profile_image ? "Change photo" : "Upload photo"}
              </Button>
              {patient.profile_image && (
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

      <Card>
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
          <Field label="Email" error={errors.email}>
            <Input type="email" invalid={!!errors.email} value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <Input invalid={!!errors.phone} value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Date of birth">
            <Input value={formatDate(patient.dob)} disabled />
          </Field>
        </div>

        {patient.medical_history && (
          <div className="mt-4">
            <div className="mb-1.5 text-xs font-bold text-ink-soft">Medical history</div>
            <Textarea value={patient.medical_history} disabled className="h-24 bg-surface-alt" />
          </div>
        )}
      </Card>

      <Button className="mt-6" loading={saving} onClick={handleSave}>
        Save changes
      </Button>
    </FadeIn>
  );
}
