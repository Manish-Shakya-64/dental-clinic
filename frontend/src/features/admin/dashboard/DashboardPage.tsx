import { useGetDashboardReportQuery } from "@/features/reports/reportsApi";
import { getApiErrorMessage } from "@/api/apiSlice";
import { formatDate } from "@/lib/dateTime";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeIn, StaggerItem, StaggerList } from "@/components/ui/FadeIn";
import { BookingsChart } from "@/features/admin/dashboard/BookingsChart";

const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className="font-heading mt-2 text-[22px] font-extrabold text-ink">{value}</div>
    </Card>
  );
}

const ACTIVITY_STYLES: Record<string, { label: string; color: string }> = {
  CANCELLED: { label: "Cancellation", color: "#B98A2E" },
  NO_SHOW: { label: "No-show", color: "#D9765F" },
};

export function DashboardPage() {
  const { data, isLoading, isError, error } = useGetDashboardReportQuery();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="rounded-2xl bg-coral-alt/10 px-5 py-4 text-sm font-semibold text-coral-alt">{getApiErrorMessage(error)}</div>;
  }

  return (
    <FadeIn className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Total bookings" value={String(data.totalAppointments)} />
        <StatTile label="Cancellations" value={String(data.cancellations)} />
        <StatTile label="No-shows" value={String(data.noShows)} />
        <StatTile label="Utilization" value={`${Math.round(data.slotUtilization * 100)}%`} />
        <StatTile label="Revenue" value={currency.format(data.revenue)} />
      </div>

      <Card>
        <div className="font-heading mb-4 text-[15px] font-bold text-ink">Bookings, last 30 days</div>
        <BookingsChart series={data.dailySeries} />
      </Card>

      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="font-heading text-[15px] font-bold text-ink">Recent activity</div>
        </div>
        <Card padded={false} className="overflow-hidden">
          {data.recentActivity.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-faint">No cancellations or no-shows recently.</div>
          ) : (
            <StaggerList>
              {data.recentActivity.map((item, i) => {
                const style = ACTIVITY_STYLES[item.type];
                return (
                  <StaggerItem key={item.id}>
                    <div
                      className={`flex items-center justify-between px-5 py-3.5 text-[13.5px] ${
                        i !== data.recentActivity.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <span className="font-semibold text-ink">{item.patientName}</span>
                      <span className="font-bold" style={{ color: style.color }}>
                        {style.label}
                      </span>
                      <span className="text-placeholder">{formatDate(item.date)}</span>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          )}
        </Card>
      </div>
    </FadeIn>
  );
}
