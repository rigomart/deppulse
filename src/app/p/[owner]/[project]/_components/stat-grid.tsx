interface Stat {
  label: string;
  value: string;
  description?: string;
}

interface StatGridProps {
  stats: Stat[];
  columns?: string;
}

export function StatGrid({
  stats,
  columns = "grid-cols-2 sm:grid-cols-3",
}: StatGridProps) {
  return (
    <div
      className={`grid ${columns} rounded-lg border border-border overflow-hidden`}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="px-4 py-3 border-b border-r border-border"
        >
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className="text-lg font-semibold text-foreground mt-0.5">
            {stat.value}
            {stat.description && (
              <span className="text-xs text-muted-foreground font-normal ml-1">
                {stat.description}
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
