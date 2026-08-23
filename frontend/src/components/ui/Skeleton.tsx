import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-border", className)} />;
}

export function SkeletonRows({ count, rowClassName }: { count: number; rowClassName?: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("h-16 w-full rounded-2xl", rowClassName)} />
      ))}
    </div>
  );
}
