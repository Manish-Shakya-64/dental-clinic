export function ComingSoon({ portal }: { portal: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 text-center">
      <div className="rounded-3xl bg-surface p-10 shadow-[20px_20px_50px_rgba(163,184,204,0.35)]">
        <div className="font-heading text-lg font-bold text-ink">{portal} portal</div>
        <p className="mt-2 max-w-xs text-sm text-faint">This portal is coming in a later build phase. The Doctor portal is live today.</p>
      </div>
    </div>
  );
}
