import { useState } from "react";
import { useListWaitlistQuery, useRemoveFromWaitlistMutation } from "@/features/waitlist/waitlistApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { formatDate } from "@/lib/dateTime";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { OfferSlotModal } from "@/features/reception/waitlist/OfferSlotModal";
import { doctorName, fullName } from "@/lib/personName";
import type { Waitlist } from "@/types/api";

function preferredWindow(entry: Waitlist): string {
  if (entry.preferred_window_start && entry.preferred_window_end) {
    return `${formatDate(entry.preferred_window_start)} – ${formatDate(entry.preferred_window_end)}`;
  }
  return "Any time";
}

export function WaitlistPage() {
  const { data, isLoading, isError, error } = useListWaitlistQuery();
  const [removeEntry, { isLoading: removing }] = useRemoveFromWaitlistMutation();
  const dispatch = useAppDispatch();

  const [offering, setOffering] = useState<Waitlist | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Waitlist | null>(null);

  async function handleRemove() {
    if (!confirmRemove) return;
    try {
      await removeEntry(confirmRemove._id).unwrap();
      dispatch(showToast("Removed from waitlist", "success"));
      setConfirmRemove(null);
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="font-heading mb-5 text-[22px] font-bold text-ink">Waitlist</div>

      {isLoading && <SkeletonRows count={4} />}
      {isError && <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>}

      {!isLoading && !isError && data && (
        <>
          {data.length === 0 ? (
            <Card className="text-center text-sm text-faint">Nobody is on the waitlist right now.</Card>
          ) : (
            <StaggerList className="flex flex-col gap-2.5">
              {data
                .filter((entry) => entry.patient && entry.reason)
                .map((entry) => (
                <StaggerItem key={entry._id}>
                  <div className="flex flex-col gap-3.5 rounded-2xl bg-surface px-5 py-4 shadow-[4px_4px_12px_rgba(163,184,204,0.15)] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex flex-col gap-1 sm:flex-1 sm:flex-row sm:items-center sm:gap-7">
                      <div className="sm:w-36 sm:flex-shrink-0">
                        <div className="text-sm font-bold text-ink">{fullName(entry.patient)}</div>
                      </div>
                      <div className="sm:w-40 sm:flex-shrink-0 text-[13px] text-muted">{entry.reason.label}</div>
                      <div className="sm:w-36 sm:flex-shrink-0 text-[13px] text-muted">
                        {entry.preferred_practitioner ? doctorName(entry.preferred_practitioner) : "No preference"}
                      </div>
                      <div className="text-[13px] text-muted">{preferredWindow(entry)}</div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <Button variant="secondary" onClick={() => setOffering(entry)}>
                        Offer this slot
                      </Button>
                      <button onClick={() => setConfirmRemove(entry)} className="text-coral-alt hover:text-coral-alt/70" title="Remove">
                        🗑
                      </button>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </>
      )}

      <OfferSlotModal open={!!offering} onClose={() => setOffering(null)} entry={offering} />
      <ConfirmModal
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemove}
        loading={removing}
        title="Remove from waitlist?"
        description={`${confirmRemove?.patient ? fullName(confirmRemove.patient) : "This patient"} will no longer be offered reopened slots for this treatment.`}
      />
    </div>
  );
}
