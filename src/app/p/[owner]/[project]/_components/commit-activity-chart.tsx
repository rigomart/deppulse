"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface CommitActivityChartProps {
  commitActivity: Array<{ week: string; commits: number }> | null;
  commitsLastYear: number;
}

const chartConfig = {
  commits: {
    label: "Commits",
    color: "oklch(0.7 0.15 180)",
  },
} satisfies ChartConfig;

/**
 * Adds display labels to the pre-aggregated weekly commit data.
 */
function addWeekLabels(
  data: Array<{ week: string; commits: number }>,
): Array<{ week: string; commits: number; weekLabel: string }> {
  return data.map((item) => ({
    ...item,
    weekLabel: format(new Date(item.week), "MMM d"),
  }));
}

export function CommitActivityChart({
  commitActivity,
  commitsLastYear,
}: CommitActivityChartProps) {
  const chartData = useMemo(
    () => addWeekLabels(commitActivity ?? []),
    [commitActivity],
  );

  const hasData = commitActivity && commitActivity.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Commit Activity (1yr)</span>
          <span className="text-muted-foreground font-normal">
            {commitsLastYear} commits
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <AreaChart data={chartData} margin={{ left: 0, right: 0 }}>
              <defs>
                <linearGradient id="fillCommits" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-commits)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-commits)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="weekLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />
              <YAxis hide />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      if (payload?.[0]?.payload?.week) {
                        return format(
                          new Date(payload[0].payload.week),
                          "MMM d, yyyy",
                        );
                      }
                      return "";
                    }}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="commits"
                stroke="var(--color-commits)"
                fill="url(#fillCommits)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-1">
            <span>Stats unavailable</span>
            <span className="text-xs">GitHub may still be computing</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
