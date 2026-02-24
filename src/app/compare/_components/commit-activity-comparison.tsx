"use client";

import { format } from "date-fns";
import { BarChart3, Loader2 } from "lucide-react";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import { Container } from "@/components/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { AnalysisRun, CommitActivityWeek } from "@/lib/domain/assessment";

interface CommitActivityComparisonProps {
  runA: AnalysisRun;
  runB: AnalysisRun;
}

interface MergedPoint {
  weekLabel: string;
  commitsA: number;
  commitsB: number;
}

function mergeWeeklyData(
  weeksA: CommitActivityWeek[],
  weeksB: CommitActivityWeek[],
): MergedPoint[] {
  const map = new Map<string, { commitsA: number; commitsB: number }>();

  for (const w of weeksA) {
    map.set(w.weekStart, { commitsA: w.totalCommits, commitsB: 0 });
  }
  for (const w of weeksB) {
    const existing = map.get(w.weekStart);
    if (existing) {
      existing.commitsB = w.totalCommits;
    } else {
      map.set(w.weekStart, { commitsA: 0, commitsB: w.totalCommits });
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([weekStart, data]) => ({
      weekLabel: format(new Date(weekStart), "MMM d"),
      commitsA: data.commitsA,
      commitsB: data.commitsB,
    }));
}

export function CommitActivityComparison({
  runA,
  runB,
}: CommitActivityComparisonProps) {
  const activityA = runA.metrics?.commitActivity;
  const activityB = runB.metrics?.commitActivity;

  const readyA = activityA?.state === "ready";
  const readyB = activityB?.state === "ready";

  if (!readyA && !readyB) {
    const isPending =
      activityA?.state === "pending" || activityB?.state === "pending";

    return (
      <Container>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Commit Activity (past year)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[220px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/50">
              {isPending ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
              ) : (
                <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
              )}
              <p className="text-sm text-muted-foreground">
                {isPending
                  ? "Commit history is loading. This may take a moment."
                  : "Commit history is not available for these repositories."}
              </p>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const weeksA = readyA ? (activityA?.weekly ?? []) : [];
  const weeksB = readyB ? (activityB?.weekly ?? []) : [];
  const points = mergeWeeklyData(weeksA, weeksB);

  if (points.length === 0) {
    return (
      <Container>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Commit Activity (past year)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[220px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/50">
              <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No commits found in the past year.
              </p>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const chartConfig: ChartConfig = {
    commitsA: {
      label: runA.repository.fullName,
      color: "var(--chart-1)",
    },
    commitsB: {
      label: runB.repository.fullName,
      color: "var(--chart-2)",
    },
  };

  return (
    <Container>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Commit Activity (past year)
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {readyA && (
                <Line
                  type="monotone"
                  dataKey="commitsA"
                  stroke="var(--color-commitsA)"
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {readyB && (
                <Line
                  type="monotone"
                  dataKey="commitsB"
                  stroke="var(--color-commitsB)"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ChartContainer>
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div
                className="size-2.5 rounded-full"
                style={{
                  backgroundColor: readyA
                    ? "var(--chart-1)"
                    : "var(--muted-foreground)",
                  opacity: readyA ? 1 : 0.4,
                }}
              />
              <span>
                {runA.repository.fullName}
                {!readyA && (
                  <span className="ml-1 text-muted-foreground/60">
                    {`(${activityA?.state === "pending" ? "loading" : "unavailable"})`}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="size-2.5 rounded-full"
                style={{
                  backgroundColor: readyB
                    ? "var(--chart-2)"
                    : "var(--muted-foreground)",
                  opacity: readyB ? 1 : 0.4,
                }}
              />
              <span>
                {runB.repository.fullName}
                {!readyB && (
                  <span className="ml-1 text-muted-foreground/60">
                    {`(${activityB?.state === "pending" ? "loading" : "unavailable"})`}
                  </span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
