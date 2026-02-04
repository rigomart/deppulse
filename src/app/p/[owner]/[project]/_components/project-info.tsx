import { Suspense } from "react";
import {
  Calendar,
  Code2,
  ExternalLink,
  GitFork,
  Scale,
  Star,
} from "lucide-react";
import Image from "next/image";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { formatNumber } from "@/lib/utils";
import { RelativeTime } from "@/components/relative-time";

interface ProjectInfoProps {
  run: AnalysisRun;
}

export function ProjectInfo({ run }: ProjectInfoProps) {
  const metrics = run.metrics;

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {metrics?.avatarUrl && (
          <Image
            src={metrics.avatarUrl}
            alt={`${run.repository.owner} avatar`}
            width={40}
            height={40}
            className="rounded-full"
          />
        )}
        {metrics?.htmlUrl ? (
          <a
            href={metrics.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-2xl sm:text-3xl font-bold tracking-tight hover:underline"
          >
            <span>{run.repository.fullName}</span>
            <ExternalLink className="size-4 opacity-0 transition-opacity group-hover:opacity-70" />
          </a>
        ) : (
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {run.repository.fullName}
          </h1>
        )}
      </div>

      {metrics?.description && (
        <p className="text-base text-muted-foreground leading-relaxed">
          {metrics.description}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-muted-foreground">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-1.5"
              title={stat.label}
            >
              <stat.icon className="size-4 opacity-70" />
              <span className="font-medium text-foreground/80">
                {stat.value}
              </span>
            </div>
          ))}
          {metrics?.repositoryCreatedAt && (
            <div className="flex items-center gap-1.5" title="Created">
              <Calendar className="size-4 opacity-70" />
              <Suspense
                fallback={
                  <span className="font-medium text-foreground/80">—</span>
                }
              >
                <RelativeTime
                  date={metrics.repositoryCreatedAt}
                  className="font-medium text-foreground/80"
                />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
