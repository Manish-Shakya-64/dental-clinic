import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListPatientsQuery } from "@/features/patients/patientsApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { formatDate } from "@/lib/dateTime";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { TableAction } from "@/components/ui/TableAction";
import { CalendarDays, Pencil } from "lucide-react";
import { fullName } from "@/lib/personName";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { usePortalBase } from "@/lib/portalBase";

const GRID_COLS = "grid-cols-[2fr_2fr_1.2fr_1fr_0.9fr]";
const PAGE_SIZE = 10;

export function PatientsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const base = usePortalBase();
  const debouncedSearch = useDebouncedValue(search);

  const isEmail = debouncedSearch.includes("@");
  const { data, isFetching, isLoading, isError, error } = useListPatientsQuery({
    ...(debouncedSearch.trim() ? (isEmail ? { email: debouncedSearch.trim() } : { phone: debouncedSearch.trim() }) : {}),
    page,
    limit: PAGE_SIZE,
  });

  function handleSearchChange(next: string) {
    setSearch(next);
    setPage(1);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Input placeholder="Search by email or phone…" value={search} onChange={(e) => handleSearchChange(e.target.value)} className="max-w-sm" />
        <Button onClick={() => navigate(`${base}/patients/new`)}>+ Add patient</Button>
      </div>

      {isLoading && <SkeletonRows count={6} />}
      {isError && <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>}

      {!isLoading && !isError && data && (
        <>
          <Card padded={false} className={`overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
            <div className="min-w-[560px]">
              <div className={`grid ${GRID_COLS} border-b border-border px-5 py-3.5 text-[12px] font-bold tracking-wide text-placeholder uppercase`}>
                <div>Name</div>
                <div>Email</div>
                <div>Phone</div>
                <div>Date of birth</div>
                <div>Actions</div>
              </div>
              {data.data.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-faint">No patients found.</div>
              ) : (
                <StaggerList>
                  {data.data.map((p, i) => (
                    <StaggerItem key={p._id}>
                      <div
                        className={`grid ${GRID_COLS} w-full items-center px-5 py-3.5 text-left text-[13.5px] ${i !== data.data.length - 1 ? "border-b border-border" : ""}`}
                      >
                        <div className="font-bold text-ink">{fullName(p)}</div>
                        <div className="truncate text-muted">{p.email}</div>
                        <div className="text-muted">{p.phone}</div>
                        <div className="text-muted">{formatDate(p.dob)}</div>
                        <div className="flex items-center gap-1">
                          <TableAction icon={Pencil} label="Edit patient" onClick={() => navigate(`${base}/patients/${p._id}/edit`)} />
                          {base === "/admin" && (
                            <TableAction
                              icon={CalendarDays}
                              label="View appointments"
                              onClick={() => navigate(`/admin/appointments?patient=${p._id}`)}
                            />
                          )}
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerList>
              )}
            </div>
          </Card>

          <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
