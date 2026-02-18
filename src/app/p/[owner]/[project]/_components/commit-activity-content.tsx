"use client";

import { format } from "date-fns";
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

export function CommitActivityContent({ run }: CommitActivityContentProps) {
  const commitActivity = run.metrics?.commitActivity;

  if (!commitActivity) {
    return (
      <p className="text-sm text-muted-foreground">
        Analysis in progress. Commit activity will appear when available.
      </p>
    );
  }

  if (commitActivity.state === "pending") {
    return (
      <p className="text-sm text-muted-foreground">
        Waiting for GitHub commit stats
        {commitActivity.attempts > 0
          ? ` (attempt ${commitActivity.attempts})`
          : ""}
        ...
      </p>
    );
  }

  if (commitActivity.state === "failed") {
    return (
      <p className="text-sm text-muted-foreground">
        {commitActivity.errorMessage ??
          "Commit activity is currently unavailable for this repository."}
      </p>
    );
  }

  const points = commitActivity.weekly.map((week) => ({
    weekLabel: format(new Date(week.weekStart), "MMM d"),
    commits: week.totalCommits,
  }));

  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No commit activity found in the last year.
      </p>
    );
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
