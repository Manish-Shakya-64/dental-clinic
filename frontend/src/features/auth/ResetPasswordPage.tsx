import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useResetPasswordMutation } from "@/features/auth/authApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AuthError, AuthHeading, AuthLayout } from "@/features/auth/AuthLayout";
import loginImage from "@/assets/login-page.webp";
import { confirmPasswordError, passwordError } from "@/lib/validators";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const errors = {
      newPassword: passwordError(newPassword),
      confirmPassword: confirmPasswordError(newPassword, confirmPassword),
    };
    setFieldErrors(errors);
    if (errors.newPassword || errors.confirmPassword) return;

    try {
      await resetPassword({ token, newPassword }).unwrap();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <AuthLayout
      image={loginImage}
      imageAlt="Treatment room at Bright Smile Dental Clinic"
      headline="Pick a new password"
      tagline="Choose something strong you haven't used elsewhere — you'll be signed straight back in afterwards."
      points={["At least 8 characters", "Signs out your other devices", "Takes effect immediately"]}
    >
      <AuthHeading title="Set new password" subtitle="Choose a strong password you haven't used before." />

      {!token && (
        <div className="mb-5">
          <AuthError message="This link is missing a reset token. Request a new one from the forgot-password page." />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Field label="New password" error={fieldErrors.newPassword}>
            <PasswordInput
              autoComplete="new-password"
              invalid={!!fieldErrors.newPassword}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword) setFieldErrors((f) => ({ ...f, newPassword: undefined }));
              }}
              placeholder="••••••••"
            />
          </Field>
          <Field label="Confirm password" error={fieldErrors.confirmPassword}>
            <PasswordInput
              autoComplete="new-password"
              invalid={!!fieldErrors.confirmPassword}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) setFieldErrors((f) => ({ ...f, confirmPassword: undefined }));
              }}
              placeholder="••••••••"
            />
          </Field>

          {error && <AuthError message={error} />}

          <Button type="submit" loading={isLoading} fullWidth disabled={!token}>
            Reset password
          </Button>
        </form>

      <div className="mt-7 text-center">
        <Link to="/login" className="text-[13px] font-bold text-primary">
          ← Back to log in
        </Link>
      </div>
    </AuthLayout>
  );
}
