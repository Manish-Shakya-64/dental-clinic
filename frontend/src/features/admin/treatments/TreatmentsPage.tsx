import { useState } from "react";
import { useListTreatmentsQuery } from "@/features/treatments/treatmentsApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { TableAction } from "@/components/ui/TableAction";
import { Pencil } from "lucide-react";
import { TreatmentFormModal } from "@/features/admin/treatments/TreatmentFormModal";
import type { Treatment } from "@/types/api";

const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
const GRID_COLS = "grid-cols-[2.2fr_1fr_1fr_1fr_0.6fr]";

export function TreatmentsPage() {
  const { data, isLoading, isError, error } = useListTreatmentsQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Treatment | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(t: Treatment) {
    setEditing(t);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="font-heading text-lg font-bold text-ink">Treatments & fee schedule</div>
        <Button onClick={openCreate}>+ Add treatment type</Button>
      </div>

      {isLoading && <SkeletonRows count={6} />}
      {isError && <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>}

      {!isLoading && !isError && data && (
        <Card padded={false} className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className={`grid ${GRID_COLS} border-b border-border px-5 py-3.5 text-[12px] font-bold tracking-wide text-placeholder uppercase`}>
              <div>Name</div>
              <div>Duration</div>
              <div>Buffer</div>
              <div>Price</div>
              <div>Actions</div>
            </div>
            <StaggerList>
              {data.map((t, i) => (
                <StaggerItem key={t._id}>
                  <div className={`grid ${GRID_COLS} items-center px-5 py-3.5 text-[13.5px] ${i !== data.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="font-bold text-ink">{t.label}</div>
                    <div className="text-muted">{t.default_duration_mins} min</div>
                    <div className="text-muted">{t.buffer_after_mins} min</div>
                    <div className="font-bold text-ink">{currency.format(t.price)}</div>
                    <div className="justify-self-start">
                      <TableAction icon={Pencil} label="Edit treatment" onClick={() => openEdit(t)} />
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          </div>
        </Card>
      )}

      <TreatmentFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
    </div>
  );
}
