import { Code2, ExternalLink, GitFork, Scale, Star } from "lucide-react";
import Image from "next/image";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { formatNumber } from "@/lib/utils";

const sizeConfig = {
  default: {
    avatar: 40,
    wrapper: "space-y-4",
    headerRow: "flex items-center gap-3",
    linkClass:
      "group flex items-center gap-2 text-2xl sm:text-3xl font-bold tracking-tight hover:underline",
    nameClass: "",
    fallbackTag: "h1" as const,
    fallbackClass: "text-2xl sm:text-3xl font-bold tracking-tight",
    externalIcon: "size-4 opacity-0 transition-opacity group-hover:opacity-70",
    description: "text-base text-muted-foreground leading-relaxed",
    statsRow:
      "flex flex-wrap items-center gap-x-5 gap-y-2.5 pt-2 text-sm text-muted-foreground",
    statItem: "flex items-center gap-1.5",
    statIcon: "size-4 opacity-70",
  },
  compact: {
    avatar: 32,
    wrapper: "space-y-3",
    headerRow: "flex items-center gap-3 min-w-0",
    linkClass:
      "group flex items-center gap-1.5 font-bold tracking-tight truncate hover:underline text-lg",
    nameClass: "truncate",
    fallbackTag: "p" as const,
    fallbackClass: "font-bold tracking-tight truncate text-lg",
    externalIcon:
      "size-3.5 opacity-0 transition-opacity group-hover:opacity-70 shrink-0",
    description: "text-sm text-muted-foreground line-clamp-2",
    statsRow:
      "flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground",
    statItem: "flex items-center gap-1",
    statIcon: "size-3.5 opacity-70",
  },
} as const;

interface RepositoryStatsProps {
  run: AnalysisRun;
  size?: "default" | "compact";
  trailing?: React.ReactNode;
  children?: React.ReactNode;
}

export function RepositoryStats({
  run,
  size = "default",
  trailing,
  children,
}: RepositoryStatsProps) {
  const metrics = run.metrics;
  const cfg = sizeConfig[size];

  const stats = [
    {
      icon: Star,
      value: formatNumber(metrics?.stars ?? 0),
      label: "Stars",
    },
    {
      icon: GitFork,
      value: formatNumber(metrics?.forks ?? 0),
      label: "Forks",
    },
    { icon: Scale, value: metrics?.license, label: "License" },
    { icon: Code2, value: metrics?.language, label: "Language" },
  ].filter((s) => s.value);

  const FallbackTag = cfg.fallbackTag;

  return (
    <div data-slot="repository-stats" className={cfg.wrapper}>
      <div
        className={
          trailing ? "flex items-center justify-between gap-3" : undefined
        }
      >
        <div className={cfg.headerRow}>
          {metrics?.avatarUrl && (
            <Image
              src={metrics.avatarUrl}
              alt={`${run.repository.owner} avatar`}
              width={cfg.avatar}
              height={cfg.avatar}
              className={`rounded-full${size === "compact" ? " shrink-0" : ""}`}
            />
          )}
          {metrics?.htmlUrl ? (
            <a
              href={metrics.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cfg.linkClass}
            >
              <span className={cfg.nameClass}>{run.repository.fullName}</span>
              <ExternalLink className={cfg.externalIcon} />
            </a>
          ) : (
            <FallbackTag className={cfg.fallbackClass}>
              {run.repository.fullName}
            </FallbackTag>
          )}
        </div>
        {trailing}
      </div>

      {metrics?.description && (
        <p className={cfg.description}>{metrics.description}</p>
      )}

      <div className={cfg.statsRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={cfg.statItem} title={stat.label}>
            <stat.icon className={cfg.statIcon} />
            <span className="font-medium text-foreground/80">{stat.value}</span>
          </div>
        ))}
        {children}
      </div>
    </div>
  );
}
