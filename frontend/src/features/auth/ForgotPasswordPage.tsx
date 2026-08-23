import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useForgotPasswordMutation } from "@/features/auth/authApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { FadeIn } from "@/components/ui/FadeIn";
import { AuthError, AuthHeading, AuthLayout } from "@/features/auth/AuthLayout";
import loginImage from "@/assets/login-page.webp";
import { emailError as validateEmail } from "@/lib/validators";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const emailIssue = validateEmail(email);
    setFieldError(emailIssue);
    if (emailIssue) return;

    try {
      await forgotPassword({ email }).unwrap();
      setSent(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <AuthLayout
      image={loginImage}
      imageAlt="Treatment room at Bright Smile Dental Clinic"
      headline="Locked out? It happens."
      tagline="We'll email you a secure link so you can set a new password and get straight back in."
      points={["Reset links expire after 30 minutes", "Other sessions stay signed in", "We never email your password"]}
    >
      {sent ? (
        <FadeIn className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary-tint">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path d="M4 5h16a1 1 0 011 1v11a1 1 0 01-1 1H8l-4 4V6a1 1 0 011-1z" stroke="#3D7DBF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="font-heading text-[20px] font-extrabold text-ink">Check your email</div>
          <div className="mt-2 text-[13.5px] leading-relaxed text-faint">
            If an account exists for {email}, we've sent a link to reset your password.
          </div>
          <Link to="/login" className="mt-7 inline-block text-[13px] font-bold text-primary">
            ← Back to log in
          </Link>
        </FadeIn>
      ) : (
        <>
          <AuthHeading title="Forgot password?" subtitle="No worries — enter your email and we'll send you a link to reset it." />

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Field label="Email" error={fieldError}>
              <Input
                type="email"
                autoComplete="username"
                invalid={!!fieldError}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(undefined);
                }}
              />
            </Field>

            {error && <AuthError message={error} />}

            <Button type="submit" loading={isLoading} fullWidth>
              Send reset link
            </Button>
          </form>

          <div className="mt-7 text-center">
            <Link to="/login" className="text-[13px] font-bold text-primary">
              ← Back to log in
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
