import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppDispatch } from "@/app/hooks";
import { setCredentials } from "@/features/auth/authSlice";
import { useRegisterMutation, useLoginMutation } from "@/features/auth/authApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { NameFields } from "@/components/ui/NameFields";
import { GenderSelect } from "@/components/ui/GenderSelect";
import { cn } from "@/lib/cn";
import { roleHomePath } from "@/lib/roleHomePath";
import { collectErrors, confirmPasswordError, emailError, passwordError, phoneError, requiredError } from "@/lib/validators";
import type { Gender } from "@/types/api";

interface FormState {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: Gender | "";
  phone: string;
  dob: string;
  address: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_FORM: FormState = {
  first_name: "",
  middle_name: "",
  last_name: "",
  gender: "",
  phone: "",
  dob: "",
  address: "",
  email: "",
  password: "",
  confirmPassword: "",
};

type FieldKey = keyof FormState;
type Errors = Partial<Record<FieldKey, string>>;

const STEP_LABELS = ["Your details", "Account"];

export function SignupPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [register, { isLoading: registering }] = useRegisterMutation();
  const [login, { isLoading: loggingIn }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  function setField<K extends FieldKey>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    // Re-validate the confirm-password field live once it's already showing an error, since it
    // depends on the password field too.
    if (key === "password" && errors.confirmPassword) {
      setErrors((e) => ({ ...e, confirmPassword: confirmPasswordError(value as string, form.confirmPassword) }));
    }
  }

  function validateStep1(): Errors {
    return collectErrors<FieldKey>({
      first_name: requiredError(form.first_name, "First name"),
      middle_name: undefined,
      last_name: undefined,
      gender: form.gender ? undefined : "Gender is required",
      phone: phoneError(form.phone),
      dob: requiredError(form.dob, "Date of birth"),
      address: undefined,
      email: undefined,
      password: undefined,
      confirmPassword: undefined,
    });
  }

  function validateStep2(): Errors {
    return collectErrors<FieldKey>({
      first_name: undefined,
      middle_name: undefined,
      last_name: undefined,
      gender: undefined,
      phone: undefined,
      dob: undefined,
      address: undefined,
      email: emailError(form.email),
      password: passwordError(form.password),
      confirmPassword: confirmPasswordError(form.password, form.confirmPassword),
    });
  }

  function handleContinue() {
    const stepErrors = validateStep1();
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) setStep(1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const stepErrors = validateStep2();
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    try {
      await register({
        first_name: form.first_name,
        middle_name: form.middle_name,
        last_name: form.last_name,
        gender: form.gender as Gender,
        phone: form.phone,
        dob: form.dob,
        address: form.address,
        email: form.email,
        password: form.password,
      }).unwrap();
      const result = await login({ email: form.email, password: form.password }).unwrap();
      dispatch(setCredentials(result));
      navigate(roleHomePath(result.user.role), { replace: true });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm rounded-3xl bg-surface p-9 shadow-[20px_20px_50px_rgba(163,184,204,0.35)]"
      >
        <div className="font-heading text-center text-xl font-bold text-ink">Create your account</div>
        <div className="mt-1 text-center text-sm text-faint">Book and manage appointments online</div>

        <div className="mt-6 flex items-center gap-2.5">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2.5">
              <div
                className={cn(
                  "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  i <= step ? "bg-primary text-white" : "bg-page text-placeholder",
                )}
              >
                {i + 1}
              </div>
              <div className={cn("text-[12px] font-semibold", i <= step ? "text-ink-soft" : "text-placeholder")}>{label}</div>
              {i === 0 && <div className={cn("h-0.5 flex-1 rounded-full", step > 0 ? "bg-primary" : "bg-page")} />}
            </div>
          ))}
        </div>

        {step === 0 ? (
          <div className="mt-6 flex flex-col gap-3.5">
            <NameFields
              value={form}
              onChange={(next) => {
                setForm((f) => ({ ...f, ...next }));
                if (errors.first_name) setErrors((e) => ({ ...e, first_name: undefined }));
              }}
              className="grid grid-cols-1 gap-3.5"
              firstNameError={errors.first_name}
            />
            <GenderSelect value={form.gender} onChange={(g) => setField("gender", g)} required error={errors.gender} />
            <Field label="Phone" error={errors.phone}>
              <Input invalid={!!errors.phone} value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
            </Field>
            <Field label="Date of birth" error={errors.dob}>
              <Input invalid={!!errors.dob} type="date" value={form.dob} onChange={(e) => setField("dob", e.target.value)} />
            </Field>
            <Field label="Address (optional)">
              <Input value={form.address} onChange={(e) => setField("address", e.target.value)} />
            </Field>

            <Button type="button" onClick={handleContinue} fullWidth className="mt-2">
              Continue
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-3.5">
            <Field label="Email" error={errors.email}>
              <Input
                type="email"
                autoComplete="username"
                invalid={!!errors.email}
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </Field>
            <Field label="Password" error={errors.password}>
              <PasswordInput
                autoComplete="new-password"
                invalid={!!errors.password}
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="Min. 8 characters"
              />
            </Field>
            <Field label="Confirm password" error={errors.confirmPassword}>
              <PasswordInput
                autoComplete="new-password"
                invalid={!!errors.confirmPassword}
                value={form.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
                placeholder="Re-enter your password"
              />
            </Field>

            {submitError && <div className="rounded-xl bg-coral-alt/10 px-3.5 py-2.5 text-xs font-semibold text-coral-alt">{submitError}</div>}

            <div className="mt-2 flex gap-2.5">
              <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button type="submit" loading={registering || loggingIn} fullWidth>
                Sign up
              </Button>
            </div>
          </form>
        )}

        <div className="mt-5 text-center text-[13px] text-faint">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-primary">
            Log in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
