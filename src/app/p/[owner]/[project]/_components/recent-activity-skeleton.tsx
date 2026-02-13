export function RecentActivitySkeleton() {
  return (
    <div className="h-[200px] w-full rounded-lg border border-border bg-surface-2/50 relative overflow-hidden">
      <div className="absolute inset-x-8 bottom-6 h-px bg-muted animate-pulse" />
      <div className="absolute left-[20%] top-[25%] size-7 rounded-full bg-muted animate-pulse" />
      <div className="absolute left-[50%] top-[45%] size-7 rounded-full bg-muted animate-pulse" />
      <div className="absolute left-[75%] top-[65%] size-7 rounded-full bg-muted animate-pulse" />
    </div>
  );
}
