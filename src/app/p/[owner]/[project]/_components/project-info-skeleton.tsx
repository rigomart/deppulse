export function ProjectInfoSkeleton() {
  return (
    <div className="space-y-4 flex-1 min-w-0">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-4 w-full max-w-md bg-muted animate-pulse rounded" />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 pt-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
