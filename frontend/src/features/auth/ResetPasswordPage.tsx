import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useResetPasswordMutation } from "@/features/auth/authApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
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
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm rounded-3xl bg-surface p-9 shadow-[20px_20px_50px_rgba(163,184,204,0.35)]"
      >
        <div className="font-heading text-center text-xl font-bold text-ink">Set new password</div>
        <div className="mt-2 text-center text-[13.5px] text-faint">Choose a strong password you haven't used before</div>

        {!token && (
          <div className="mt-5 rounded-xl bg-coral-alt/10 px-3.5 py-2.5 text-xs font-semibold text-coral-alt">
            This link is missing a reset token. Request a new one from the forgot-password page.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-7 flex flex-col gap-4">
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

          {error && <div className="rounded-xl bg-coral-alt/10 px-3.5 py-2.5 text-xs font-semibold text-coral-alt">{error}</div>}

          <Button type="submit" loading={isLoading} fullWidth disabled={!token}>
            Reset password
          </Button>
        </form>

        <div className="mt-5 text-center">
          <Link to="/login" className="text-[13px] font-bold text-primary">
            ← Back to log in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
