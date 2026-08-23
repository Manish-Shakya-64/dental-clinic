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
import { collectErrors, emailError, phoneError, requiredError } from "@/lib/validators";
import type { Gender, StaffMember } from "@/types/api";

interface FormState {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: Gender | "";
  email: string;
  phone: string;
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

export function StaffProfilePage() {
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
      const profile = data.profile as StaffMember;
      setForm({
        first_name: profile.first_name,
        middle_name: profile.middle_name ?? "",
        last_name: profile.last_name ?? "",
        gender: profile.gender ?? "",
        email: profile.email,
        phone: profile.phone ?? "",
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

  const profile = data?.profile as StaffMember | undefined;

  if (isLoading || !form) {
    return (
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <FadeIn>
      {/* Photo panel beside the details rather than stacked above them — a full-width strip holding
        * one avatar and two buttons is mostly empty space. */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <Card>
        <div className="flex items-center gap-5 lg:flex-col lg:items-start">
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
        </div>

        <div className="mt-6 flex justify-end">
          <Button loading={saving} onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </Card>
      </div>
    </FadeIn>
  );
}
