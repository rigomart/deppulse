export function RecentActivitySkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:justify-center lg:shrink-0 animate-pulse">
        {["commit", "release", "issue", "pr"].map((slot) => (
          <div key={slot} className="flex items-stretch gap-3">
            <div className="w-0.5 shrink-0 rounded-full bg-muted" />
            <div className="py-0.5 space-y-1.5">
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="h-4 w-28 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-[200px] flex-1 min-w-0 rounded-lg border border-border bg-surface-2/50 relative overflow-hidden">
        <div className="absolute inset-x-8 bottom-6 h-px bg-muted animate-pulse" />
        <div className="absolute left-[20%] top-[25%] size-7 rounded-full bg-muted animate-pulse" />
        <div className="absolute left-[50%] top-[45%] size-7 rounded-full bg-muted animate-pulse" />
        <div className="absolute left-[75%] top-[65%] size-7 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  );
}
