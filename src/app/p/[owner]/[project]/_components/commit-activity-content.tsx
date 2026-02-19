"use client";

import { format } from "date-fns";
import { BarChart3, Loader2 } from "lucide-react";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { AnalysisRun } from "@/lib/domain/assessment";

interface CommitActivityContentProps {
  run: AnalysisRun;
}

const chartConfig: ChartConfig = {
  commits: {
    label: "Commits",
    color: "var(--chart-1)",
  },
};

function ChartSkeleton({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/50">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/50">
      <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function CommitActivityContent({ run }: CommitActivityContentProps) {
  const commitActivity = run.metrics?.commitActivity;

  if (!commitActivity || commitActivity.state === "pending") {
    return <ChartSkeleton message="Loading commit history..." />;
  }

  if (commitActivity.state === "failed") {
    return (
      <ChartEmpty
        message={
          commitActivity.errorMessage ??
          "Commit history isn't available for this repository."
        }
      />
    );
  }

  const points = commitActivity.weekly.map((week) => ({
    weekLabel: format(new Date(week.weekStart), "MMM d"),
    commits: week.totalCommits,
  }));

  if (points.length === 0) {
    return <ChartEmpty message="No commits in the past year." />;
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[220px] w-full"
    >
      <LineChart
        data={points}
        margin={{ top: 8, right: 20, bottom: 8, left: 0 }}
      >
        <XAxis
          dataKey="weekLabel"
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tick={{ fontSize: 12 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="commits"
          stroke="var(--color-commits)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
