"use client";

import { differenceInDays, format, formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, GitCommit, GitPullRequest, Tag } from "lucide-react";
import {
  CartesianGrid,
  LabelList,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import type { AnalysisRun } from "@/lib/domain/assessment";

type Recency = "recent" | "moderate" | "aging" | "stale";

interface TimelinePoint {
  timestamp: number;
  y: number;
  label: string;
  recency: Recency;
  icon: LucideIcon;
  date: Date;
}

const recencyColor: Record<Recency, string> = {
  recent: "var(--status-healthy)",
  moderate: "var(--status-moderate)",
  aging: "var(--status-declining)",
  stale: "var(--status-inactive)",
};

function getRecency(date: Date): Recency {
  const days = differenceInDays(new Date(), date);
  if (days <= 30) return "recent";
  if (days <= 90) return "moderate";
  if (days <= 180) return "aging";
  return "stale";
}

const chartConfig: ChartConfig = {
  recent: { label: "Recent", color: "var(--status-healthy)" },
  moderate: { label: "Moderate", color: "var(--status-moderate)" },
  aging: { label: "Aging", color: "var(--status-declining)" },
  stale: { label: "Inactive", color: "var(--status-inactive)" },
};

interface RecentActivityContentProps {
  run: AnalysisRun;
}

function TimelineMarker({
  cx,
  cy,
  payload,
}: {
  cx?: number;
  cy?: number;
  payload?: TimelinePoint;
}) {
  if (cx == null || cy == null || !payload) return null;
  const Icon = payload.icon;
  const color = recencyColor[payload.recency];
  return (
    <foreignObject x={cx - 12} y={cy - 12} width={24} height={24}>
      <div
        className="flex items-center justify-center size-full rounded-full shadow-sm"
        style={{ backgroundColor: color }}
      >
        <Icon className="size-3 text-white" />
      </div>
    </foreignObject>
  );
}

function TimelineLabel({
  x,
  y,
  value,
}: {
  x?: number;
  y?: number;
  value?: string;
}) {
  if (x == null || y == null || !value) return null;
  return (
    <foreignObject x={x - 55} y={y - 26} width={110} height={20}>
      <div className="hidden sm:flex items-center justify-center">
        <span className="text-xs font-medium text-foreground truncate">
          {value}
        </span>
      </div>
    </foreignObject>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TimelinePoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const Icon = point.icon;
  const color = recencyColor[point.recency];
  return (
    <div className="bg-surface-3 border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="flex items-center gap-1.5 font-medium text-foreground">
        <Icon className="size-3.5" style={{ color }} />
        {point.label}
      </div>
      <div className="text-muted-foreground mt-1">
        {format(point.date, "MMM d, yyyy")}
      </div>
      <div className="text-muted-foreground">
        {formatDistanceToNow(point.date, { addSuffix: true })}
      </div>
    </div>
  );
}

export function RecentActivityContent({ run }: RecentActivityContentProps) {
  const metrics = run.metrics;

  const rawMetrics: Array<{
    date: string | null;
    label: string;
    icon: LucideIcon;
  }> = [
    {
      date: metrics?.lastCommitAt ?? null,
      label: "Last Commit",
      icon: GitCommit,
    },
    { date: metrics?.lastReleaseAt ?? null, label: "Last Release", icon: Tag },
    {
      date: metrics?.lastClosedIssueAt ?? null,
      label: "Last Issue Closed",
      icon: CheckCircle2,
    },
    {
      date: metrics?.lastMergedPrAt ?? null,
      label: "Last PR Merged",
      icon: GitPullRequest,
    },
  ];

  const filtered = rawMetrics
    .filter((m): m is typeof m & { date: string } => m.date !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const yStep = filtered.length > 1 ? 5 / (filtered.length - 1) : 0;
  const points: TimelinePoint[] = filtered.map((m, i) => {
    const d = new Date(m.date);
    return {
      timestamp: d.getTime(),
      y: 1 + i * yStep,
      label: m.label,
      recency: getRecency(d),
      icon: m.icon,
      date: d,
    };
  });

  const missingLabels = rawMetrics
    .filter((m) => m.date === null)
    .map((m) => m.label);

  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity recorded.</p>
    );
  }

  const earliest = points[0].date;
  const rangeEnd = Date.now();
  const span = rangeEnd - earliest.getTime();
  const padding = Math.max(
    14 * 86_400_000,
    Math.min(span * 0.1, 90 * 86_400_000),
  );
  const rangeStart = earliest.getTime() - padding;
  const rangeDays = (rangeEnd - rangeStart) / 86_400_000;

  const TICK_COUNT = 5;
  const step = (rangeEnd - rangeStart) / (TICK_COUNT + 1);
  const ticks = Array.from(
    { length: TICK_COUNT },
    (_, i) => rangeStart + step * (i + 1),
  );
  const formatTick = (ts: number) =>
    rangeDays <= 180
      ? format(new Date(ts), "MMM d")
      : format(new Date(ts), "MMM ''yy");

  return (
    <div className="space-y-2">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[200px] w-full"
      >
        <ScatterChart margin={{ top: 40, right: 20, bottom: 0, left: 20 }}>
          <CartesianGrid
            vertical
            horizontal={false}
            strokeDasharray="3 3"
            stroke="var(--border)"
          />
          <XAxis
            type="number"
            dataKey="timestamp"
            domain={[rangeStart, rangeEnd]}
            ticks={ticks}
            tickFormatter={formatTick}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
            tick={{ fontSize: 12, fill: "var(--foreground)" }}
          />
          <YAxis type="number" dataKey="y" domain={[0, 6]} hide />
          <ChartTooltip cursor={false} content={<CustomTooltip />} />
          <Scatter data={points} shape={<TimelineMarker />}>
            <LabelList dataKey="label" content={<TimelineLabel />} />
          </Scatter>
        </ScatterChart>
      </ChartContainer>
      {missingLabels.length > 0 && (
        <p className="text-xs text-muted-foreground">
          No data: {missingLabels.join(", ")}
        </p>
      )}
    </div>
  );
}
