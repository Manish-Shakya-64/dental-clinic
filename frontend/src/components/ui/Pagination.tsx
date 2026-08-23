import { cn } from "@/lib/cn";

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Paged navigation for server-side–paginated tables — `page`/`pages`/`total` come straight from
 *  the API's `pagination` envelope, so changing `page` here should always re-query the backend
 *  rather than re-slice an already-fetched array. */
export function Pagination({ page, pages, total, onPageChange, className }: PaginationProps) {
  if (total === 0) return null;

  return (
    <div className={cn("mt-4 flex items-center justify-between", className)}>
      <div className="text-xs text-faint">{total} total</div>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface text-ink-soft shadow-[3px_3px_8px_rgba(163,184,204,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹
        </button>
        <div className="text-xs font-bold text-ink-soft">
          Page {page} of {Math.max(pages, 1)}
        </div>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface text-ink-soft shadow-[3px_3px_8px_rgba(163,184,204,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}
