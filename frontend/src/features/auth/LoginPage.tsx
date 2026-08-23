import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppDispatch } from "@/app/hooks";
import { setCredentials } from "@/features/auth/authSlice";
import { useLoginMutation } from "@/features/auth/authApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { roleHomePath } from "@/lib/roleHomePath";
import { emailError as validateEmail } from "@/lib/validators";

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
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm rounded-3xl bg-surface p-9 shadow-[20px_20px_50px_rgba(163,184,204,0.35)]"
      >
        <div className="font-heading text-center text-xl font-bold text-ink">Bright Smile</div>
        <div className="mt-1 text-center text-sm text-faint">Sign in to your account</div>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
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

          {error && <div className="rounded-xl bg-coral-alt/10 px-3.5 py-2.5 text-xs font-semibold text-coral-alt">{error}</div>}

          <Button type="submit" loading={isLoading} fullWidth className="mt-2">
            Log in
          </Button>
        </form>

        <div className="mt-5 text-center text-[13px] text-faint">
          Don't have an account?{" "}
          <Link to="/signup" className="font-bold text-primary">
            Sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
