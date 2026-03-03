import { format } from "date-fns";
import { Clock, GitCommit, Repeat, Tag } from "lucide-react";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { computeReleaseCadence } from "@/lib/release-cadence";
import { RelativeTime } from "./relative-time";

interface ActivitySummaryProps {
  run: AnalysisRun;
}

export function ActivitySummary({ run }: ActivitySummaryProps) {
  const metrics = run.metrics;
  const analyzedAt = run.completedAt ?? run.startedAt;

  if (!metrics) {
    return (
      <StatsBar>
        <Stat icon={GitCommit} label="Last commit" value="—" />
        <Stat icon={Tag} label="Last release" value="—" />
        <Stat icon={Repeat} label="Release cadence" value="—" />
        <Stat
          icon={Clock}
          label="Analyzed"
          value={format(new Date(analyzedAt), "MMM d, yyyy")}
          sub={<RelativeTime date={analyzedAt} />}
        />
      </StatsBar>
    );
  }

  const latestRelease = metrics.releases[0] ?? null;
  const cadence = computeReleaseCadence(metrics.releases);

  return (
    <StatsBar>
      <Stat
        icon={GitCommit}
        label="Last commit"
        value={
          metrics.lastCommitAt
            ? format(new Date(metrics.lastCommitAt), "MMM d, yyyy")
            : "—"
        }
        sub={
          metrics.lastCommitAt ? (
            <RelativeTime date={metrics.lastCommitAt} />
          ) : undefined
        }
      />
      <Stat
        icon={Tag}
        label="Last release"
        value={latestRelease ? latestRelease.tagName : "—"}
        sub={
          latestRelease ? (
            <span>
              {format(new Date(latestRelease.publishedAt), "MMM d, yyyy")}
              {" · "}
              <RelativeTime date={latestRelease.publishedAt} />
            </span>
          ) : undefined
        }
      />
      <Stat icon={Repeat} label="Release cadence" value={cadence ?? "—"} />
      <Stat
        icon={Clock}
        label="Analyzed"
        value={format(new Date(analyzedAt), "MMM d, yyyy")}
        sub={<RelativeTime date={analyzedAt} />}
      />
    </StatsBar>
  );
}

function StatsBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-3 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
      {children}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        <Icon className="size-3.5 shrink-0" />
        {label}
      </div>
      <p className="text-base font-semibold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
