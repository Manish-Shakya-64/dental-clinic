import { useState } from "react";
import type { FormEvent } from "react";
import { useSubmitContactMutation } from "@/features/contact/contactApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { CLINIC } from "@/features/marketing/content";

const EMPTY_FORM = { name: "", email: "", phone: "", message: "" };

export function ContactPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitContact, { isLoading }] = useSubmitContactMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await submitContact(form).unwrap();
      setSent(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
      <FadeIn className="text-center">
        <h1 className="font-heading text-3xl font-extrabold text-ink sm:text-4xl">Get in touch</h1>
        <p className="mx-auto mt-3 max-w-lg text-[15.5px] leading-relaxed text-muted">
          Questions about a treatment, insurance, or your appointment? Send us a message and we'll get back to you shortly.
        </p>
      </FadeIn>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <div className="text-[11.5px] font-bold tracking-wide text-placeholder uppercase">Visit us</div>
            <div className="font-heading mt-2 text-[15px] font-bold text-ink">{CLINIC.address}</div>
          </Card>
          <Card>
            <div className="text-[11.5px] font-bold tracking-wide text-placeholder uppercase">Opening hours</div>
            <div className="font-heading mt-2 text-[15px] font-bold text-ink">{CLINIC.hours}</div>
          </Card>
          <Card>
            <div className="text-[11.5px] font-bold tracking-wide text-placeholder uppercase">Call us</div>
            <div className="font-heading mt-2 text-[15px] font-bold text-ink">{CLINIC.phone}</div>
          </Card>
        </div>

        <Card>
          {sent ? (
            <FadeIn className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-teal-tint">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#2E7A6C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="font-heading text-lg font-bold text-ink">Message sent</div>
              <div className="mt-2 max-w-xs text-[13.5px] text-faint">Thanks for reaching out — we'll be in touch shortly.</div>
              <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
                Send another message
              </Button>
            </FadeIn>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Name">
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Email">
                  <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
              </div>
              <Field label="Phone (optional)">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Message">
                <Textarea required className="h-32" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can we help?" />
              </Field>

              {error && <div className="rounded-xl bg-coral-alt/10 px-3.5 py-2.5 text-xs font-semibold text-coral-alt">{error}</div>}

              <Button type="submit" loading={isLoading} fullWidth className="mt-1">
                Send message
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
