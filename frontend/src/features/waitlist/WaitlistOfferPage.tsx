import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  useAcceptWaitlistOfferMutation,
  useDeclineWaitlistOfferMutation,
  useGetWaitlistOfferQuery,
} from "@/features/waitlist/waitlistApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Logo } from "@/components/ui/Logo";
import { formatDate, formatTime } from "@/lib/dateTime";

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[460px] rounded-3xl bg-surface p-8 shadow-[16px_16px_40px_rgba(163,184,204,0.3)] sm:p-10"
      >
        <Link to="/" className="mb-7 flex justify-center">
          <Logo size={32} textClassName="text-[18px] text-ink" />
        </Link>
        {children}
      </motion.div>
    </div>
  );
}

function Outcome({ tone, title, message }: { tone: "good" | "gone"; title: string; message: string }) {
  return (
    <div className="text-center">
      <div
        className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${tone === "good" ? "bg-teal-tint" : "bg-surface-alt"}`}
      >
        {tone === "good" ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="#2E7A6C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="#9FB2C3" strokeWidth="2" />
            <path d="M12 7v6M12 16.5v.01" stroke="#9FB2C3" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="font-heading text-[19px] font-extrabold text-ink">{title}</div>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-faint">{message}</p>
      <Link to="/login" className="mt-7 inline-block text-[13px] font-bold text-primary">
        Go to my account
      </Link>
    </div>
  );
}

/** Public landing page for the "an earlier appointment is available" email.
 *
 *  Authenticated by the token in the URL rather than a session, because the patient reading the
 *  email on their phone almost certainly isn't signed in — same trade-off as a password reset link. */
export function WaitlistOfferPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const { data: offer, isLoading, isError, error } = useGetWaitlistOfferQuery(token, { skip: !token });
  const [accept, { isLoading: accepting, isSuccess: accepted, error: acceptError }] = useAcceptWaitlistOfferMutation();
  const [decline, { isLoading: declining, isSuccess: declined }] = useDeclineWaitlistOfferMutation();

  if (!token) {
    return (
      <Shell>
        <Outcome tone="gone" title="Link incomplete" message="This link is missing its code. Please open the most recent offer email again." />
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell>
        <Skeleton className="mb-4 h-6 w-3/4" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="mt-5 h-11 rounded-full" />
      </Shell>
    );
  }

  if (isError || !offer) {
    return (
      <Shell>
        <Outcome tone="gone" title="This link isn't valid" message={getApiErrorMessage(error)} />
      </Shell>
    );
  }

  if (accepted) {
    return (
      <Shell>
        <Outcome
          tone="good"
          title="Booked — see you then"
          message={`Your ${offer.treatmentLabel} is confirmed for ${formatDate(offer.startTime)} at ${formatTime(offer.startTime)}. A confirmation email is on its way.`}
        />
      </Shell>
    );
  }

  if (declined) {
    return (
      <Shell>
        <Outcome tone="gone" title="No problem" message="We've let that one go. You're still on the waitlist, so we'll be in touch when another time opens up." />
      </Shell>
    );
  }

  // Covers losing the race, expiry, and an already-answered offer — the API returns a message that
  // says which, and each one reassures the patient they keep their place in the queue.
  if (!offer.claimable) {
    return (
      <Shell>
        <Outcome
          tone="gone"
          title={offer.status === "ACCEPTED" ? "Already claimed" : "That time has gone"}
          message={
            offer.status === "ACCEPTED"
              ? "You've already claimed this appointment. You'll find it under Appointments in your account."
              : "Someone claimed it first, or the offer expired. You're still on the waitlist and we'll let you know about the next opening."
          }
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="font-heading text-[22px] leading-tight font-extrabold text-ink">An earlier appointment is available</div>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-faint">
        Hi {offer.patientName}, a slot has opened up for your {offer.treatmentLabel}. It&apos;s offered to a few waiting patients at once, so
        it&apos;s first come, first served.
      </p>

      <div className="mt-6 rounded-2xl bg-surface-alt px-5 py-5">
        <div className="font-heading text-[17px] font-bold text-ink">{formatDate(offer.startTime)}</div>
        <div className="mt-1 text-[15px] font-semibold text-primary">{formatTime(offer.startTime)}</div>
        <div className="mt-2.5 text-[13px] text-muted">
          {offer.doctorName} · {offer.roomName}
        </div>
      </div>

      {acceptError && (
        <div className="mt-5 rounded-xl bg-coral-alt/10 px-3.5 py-3 text-[12.5px] font-semibold text-coral-alt">
          {getApiErrorMessage(acceptError)}
        </div>
      )}

      <Button fullWidth className="mt-6" loading={accepting} onClick={() => accept(token)}>
        Claim this appointment
      </Button>
      <Button variant="ghost" fullWidth className="mt-2" loading={declining} onClick={() => decline(token)}>
        No thanks, keep me waiting
      </Button>

      <p className="mt-5 text-center text-[12px] text-placeholder">
        Offer expires {formatDate(offer.expiresAt)} at {formatTime(offer.expiresAt)}
      </p>
    </Shell>
  );
}
