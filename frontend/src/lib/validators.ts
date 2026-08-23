export const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return /^[0-9+()\-\s]{7,20}$/.test(value.trim());
}

export function requiredError(value: string, label: string): string | undefined {
  return value.trim() ? undefined : `${label} is required`;
}

export function emailError(value: string): string | undefined {
  if (!value.trim()) return "Email is required";
  if (!isValidEmail(value)) return "Enter a valid email address";
  return undefined;
}

export function phoneError(value: string): string | undefined {
  if (!value.trim()) return "Phone is required";
  if (!isValidPhone(value)) return "Enter a valid phone number";
  return undefined;
}

export function passwordError(value: string): string | undefined {
  if (!value) return "Password is required";
  if (value.length < MIN_PASSWORD_LENGTH) return `Must be at least ${MIN_PASSWORD_LENGTH} characters`;
  return undefined;
}

export function confirmPasswordError(password: string, confirm: string): string | undefined {
  if (!confirm) return "Please confirm your password";
  if (password !== confirm) return "Passwords don't match";
  return undefined;
}

/** Runs a map of {field: validator-result} and returns only the entries that failed — the
 *  standard shape every step-validated / submit-validated form in the app builds its error
 *  state from. */
export function collectErrors<T extends string>(checks: Record<T, string | undefined>): Partial<Record<T, string>> {
  const errors: Partial<Record<T, string>> = {};
  for (const key in checks) {
    const message = checks[key];
    if (message) errors[key] = message;
  }
  return errors;
}
