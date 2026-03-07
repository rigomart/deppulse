"use client";

import { format, formatDistance } from "date-fns";
import { rateReleaseCadence } from "@/core/dimensions";
import {
  type AnalysisRun,
  getAnalysisTime,
  type ReleaseInfo,
} from "@/lib/domain/assessment";
import { getRecency, recencyFillColor } from "@/lib/recency";
import { cn } from "@/lib/utils";
import { DimensionSection } from "./dimension-section";
import { StatGrid } from "./stat-grid";

const MAX_RELEASES = 6;

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
                  recencyFillColor[recency],
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
  const analysisTime = getAnalysisTime(run);
  const dimension = metrics ? rateReleaseCadence(metrics, analysisTime) : null;

  const level = dimension?.level ?? null;
  const releases = metrics?.releases ?? [];
  const inputs = dimension?.inputs;
  const daysSince = inputs?.daysSinceLastRelease;

  const stats = [
    {
      label: "Releases (Year)",
      value: String(inputs?.releasesLastYear ?? 0),
    },
    {
      label: "Total Releases",
      value: String(inputs?.totalReleases ?? releases.length),
    },
    {
      label: "Last Release",
      value:
        typeof daysSince === "number"
          ? formatDistance(
              new Date(analysisTime.getTime() - daysSince * 86_400_000),
              analysisTime,
              { addSuffix: true },
            )
          : "Never",
    },
  ];

  return (
    <DimensionSection title="Release Cadence" level={level} delay="delay-200">
      <StatGrid stats={stats} />
      <RecentReleases releases={releases} />
    </DimensionSection>
  );
}
