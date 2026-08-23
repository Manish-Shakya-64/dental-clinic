import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/app/hooks";
import { setCredentials } from "@/features/auth/authSlice";
import { useLoginMutation } from "@/features/auth/authApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AuthError, AuthHeading, AuthLayout } from "@/features/auth/AuthLayout";
import { roleHomePath } from "@/lib/roleHomePath";
import { emailError as validateEmail } from "@/lib/validators";
import loginImage from "@/assets/login-page.webp";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const errors = {
      email: validateEmail(email),
      password: password ? undefined : "Password is required",
    };
    setFieldErrors(errors);
    if (errors.email || errors.password) return;

    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setCredentials(result));
      navigate(roleHomePath(result.user.role), { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <AuthLayout
      image={loginImage}
      imageAlt="Treatment room at Bright Smile Dental Clinic"
      headline="Welcome back to Bright Smile"
      tagline="Sign in to manage appointments, patients, and your day at the clinic."
      points={["Your schedule, always up to date", "Secure, role-based access", "Appointment reminders sent for you"]}
    >
      <AuthHeading title="Log in" subtitle="Enter your details to access your account." />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Email" error={fieldErrors.email}>
          <Input
            type="email"
            autoComplete="username"
            invalid={!!fieldErrors.email}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
            }}
            placeholder="you@brightsmile.au"
          />
        </Field>
        <Field label="Password" error={fieldErrors.password}>
          <PasswordInput
            autoComplete="current-password"
            invalid={!!fieldErrors.password}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
            }}
            placeholder="••••••••"
          />
        </Field>
        <Link to="/forgot-password" className="-mt-1.5 self-end text-[12.5px] font-bold text-primary">
            Forgot password?
        </Link>

        {error && <AuthError message={error} />}

        <Button type="submit" loading={isLoading} fullWidth className="mt-2">
          Log in
        </Button>
      </form>

      <div className="mt-7 text-center text-[13.5px] text-faint">
        Don't have an account?{" "}
        <Link to="/signup" className="font-bold text-primary">
          Sign up
        </Link>
      </div>
    </AuthLayout>
  );
}
