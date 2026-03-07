"use client";

import { differenceInDays, format, formatDistanceToNow } from "date-fns";
import { rateReleaseCadence } from "@/core/dimensions";
import type { AnalysisRun, ReleaseInfo } from "@/lib/domain/assessment";
import { cn } from "@/lib/utils";
import { DimensionSection } from "./dimension-section";

const MAX_RELEASES = 6;

type Recency = "recent" | "moderate" | "aging" | "stale";

const recencyDotColor: Record<Recency, string> = {
  recent: "bg-status-healthy",
  moderate: "bg-status-moderate",
  aging: "bg-status-declining",
  stale: "bg-status-inactive",
};

function getRecency(date: Date): Recency {
  const days = differenceInDays(new Date(), date);
  if (days <= 30) return "recent";
  if (days <= 90) return "moderate";
  if (days <= 180) return "aging";
  return "stale";
}

function RecentReleases({ releases }: { releases: ReleaseInfo[] }) {
  if (releases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No releases recorded.</p>
    );
  }

  const sorted = [...releases].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  const visible = sorted.slice(0, MAX_RELEASES);
  const hiddenCount = sorted.length - visible.length;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Recent Releases
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5">
        {visible.map((release) => {
          const date = new Date(release.publishedAt);
          const recency = getRecency(date);
          return (
            <div key={release.tagName} className="flex items-center gap-2 py-1">
              <div
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  recencyDotColor[recency],
                )}
              />
              <span className="text-sm font-medium text-foreground truncate">
                {release.name || release.tagName}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
                {format(date, "MMM d, yyyy")}
              </span>
            </div>
          );
        })}
      </div>
      {hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground">
          +{hiddenCount} older release{hiddenCount > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

interface ReleaseCadenceSectionProps {
  run: AnalysisRun;
}

export function ReleaseCadenceSection({ run }: ReleaseCadenceSectionProps) {
  const metrics = run.metrics;
  const analysisTime = new Date(run.completedAt ?? run.startedAt);
  const dimension = metrics ? rateReleaseCadence(metrics, analysisTime) : null;

  const level = dimension?.level ?? "inactive";
  const releases = metrics?.releases ?? [];

  const lastRelease =
    releases.length > 0
      ? releases.reduce((latest, r) =>
          new Date(r.publishedAt) > new Date(latest.publishedAt) ? r : latest,
        )
      : null;

  const lastReleaseDate = lastRelease
    ? new Date(lastRelease.publishedAt)
    : null;

  const cutoff = new Date(analysisTime);
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const releasesLastYear = releases.filter(
    (r) => new Date(r.publishedAt) >= cutoff,
  ).length;

  const stats = [
    {
      label: "Releases (Year)",
      value: String(releasesLastYear),
    },
    {
      label: "Total Releases",
      value: String(releases.length),
    },
    {
      label: "Last Release",
      value: lastReleaseDate
        ? formatDistanceToNow(lastReleaseDate, { addSuffix: true })
        : "Never",
    },
  ];

  return (
    <DimensionSection
      title="Release Cadence"
      level={level}
      delay="delay-200"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 rounded-lg border border-border overflow-hidden">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="px-4 py-3 border-b border-r border-border"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
      <RecentReleases releases={releases} />
    </DimensionSection>
  );
}
