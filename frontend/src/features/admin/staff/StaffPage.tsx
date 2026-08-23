import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListStaffQuery, useRemoveStaffMutation, useUpdateStaffMutation } from "@/features/staff/staffApi";
import { useAppDispatch } from "@/app/hooks";
import { showToast } from "@/features/toast/toastSlice";
import { getApiErrorMessage } from "@/api/apiSlice";
import { cn } from "@/lib/cn";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { staffRowName } from "@/lib/personName";
import type { Role, StaffRow } from "@/types/api";

const ROLE_LABELS: Record<string, string> = { DOCTOR: "Doctor", RECEPTIONIST: "Receptionist", ADMIN: "Admin" };
const ROLE_FILTERS: { value: Role | "ALL"; label: string }[] = [
  { value: "ALL", label: "All roles" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "ADMIN", label: "Admin" },
];
const ACTIVE_FILTERS: { value: "ALL" | "true" | "false"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const GRID_COLS = "grid-cols-[2fr_1fr_2fr_0.9fr_1.2fr]";
const PAGE_SIZE = 10;

function ActiveToggle({ row }: { row: StaffRow }) {
  const [updateStaff, { isLoading }] = useUpdateStaffMutation();
  const dispatch = useAppDispatch();

  async function toggle() {
    try {
      await updateStaff({ id: row.id, body: { is_active: !row.is_active } }).unwrap();
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  return <Toggle checked={row.is_active} onChange={toggle} disabled={isLoading} />;
}

export function StaffPage() {
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "true" | "false">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading, isFetching, isError, error } = useListStaffQuery({
    role: roleFilter === "ALL" ? undefined : roleFilter,
    is_active: activeFilter === "ALL" ? undefined : activeFilter === "true",
    search: debouncedSearch.trim() || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const [removeStaff, { isLoading: removing }] = useRemoveStaffMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [confirmRemove, setConfirmRemove] = useState<StaffRow | null>(null);

  function updateFilters(next: Partial<{ role: Role | "ALL"; active: "ALL" | "true" | "false"; search: string }>) {
    if (next.role !== undefined) setRoleFilter(next.role);
    if (next.active !== undefined) setActiveFilter(next.active);
    if (next.search !== undefined) setSearch(next.search);
    setPage(1);
  }

  async function handleRemove() {
    if (!confirmRemove) return;
    try {
      await removeStaff(confirmRemove.id).unwrap();
      dispatch(showToast("Staff member removed", "success"));
      setConfirmRemove(null);
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err), "error"));
    }
  }

  const rows = data?.data ?? [];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="font-heading text-lg font-bold text-ink">Staff</div>
        <Button onClick={() => navigate("/admin/staff/new")}>+ Add staff member</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="max-w-[220px]"
        />
        <select
          value={roleFilter}
          onChange={(e) => updateFilters({ role: e.target.value as Role | "ALL" })}
          className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {ROLE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => updateFilters({ active: e.target.value as "ALL" | "true" | "false" })}
          className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {ACTIVE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <SkeletonRows count={5} />}
      {isError && <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>}

      {!isLoading && !isError && data && (
        <>
          <Card padded={false} className={cn("overflow-x-auto", isFetching && "opacity-60")}>
            <div className="min-w-[640px]">
              <div className={`grid ${GRID_COLS} border-b border-border px-5 py-3.5 text-[12px] font-bold tracking-wide text-placeholder uppercase`}>
                <div>Name</div>
                <div>Role</div>
                <div>Email</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              {rows.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-faint">No staff members match these filters.</div>
              ) : (
                <StaggerList>
                  {rows.map((row, i) => (
                    <StaggerItem key={row.id}>
                      <div className={`grid ${GRID_COLS} items-center px-5 py-3.5 text-[13.5px] ${i !== rows.length - 1 ? "border-b border-border" : ""}`}>
                        <div className="font-bold text-ink">{staffRowName(row)}</div>
                        <div className="text-muted">{ROLE_LABELS[row.role]}</div>
                        <div className="truncate text-muted">{row.email}</div>
                        <div>
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-[11.5px] font-bold",
                              row.is_active ? "bg-teal-tint text-[#2E7A6C]" : "bg-surface-alt text-placeholder",
                            )}
                          >
                            {row.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => navigate(`/admin/staff/${row.id}/edit`)} className="text-primary hover:text-primary-dark" title="Edit">
                            ✎
                          </button>
                          <ActiveToggle row={row} />
                          <button onClick={() => setConfirmRemove(row)} className="text-coral-alt hover:text-coral-alt/70" title="Remove">
                            🗑
                          </button>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerList>
              )}
            </div>
          </Card>

          <Pagination
            page={data.pagination.page}
            pages={data.pagination.pages}
            total={data.pagination.total}
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmModal
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemove}
        loading={removing}
        title="Remove staff member?"
        description={`This will remove ${confirmRemove ? staffRowName(confirmRemove) : ""} from staff and cancel their upcoming schedule.`}
      />
    </div>
  );
}
