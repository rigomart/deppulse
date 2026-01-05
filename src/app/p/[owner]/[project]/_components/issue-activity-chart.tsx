"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface IssueActivityChartProps {
  issueActivity: Array<{ week: string; opened: number; closed: number }> | null;
  openIssuesPercent: number | null;
}

const chartConfig = {
  opened: {
    label: "Opened",
    color: "oklch(0.65 0.15 25)", // warm red/orange
  },
  closed: {
    label: "Closed",
    color: "oklch(0.7 0.15 145)", // green
  },
} satisfies ChartConfig;

/**
 * Adds display labels to the weekly issue activity data.
 */
function addWeekLabels(
  data: Array<{ week: string; opened: number; closed: number }>,
): Array<{
  week: string;
  opened: number;
  closed: number;
  weekLabel: string;
}> {
  return data.map((item) => ({
    ...item,
    weekLabel: format(new Date(item.week), "MMM d"),
  }));
}

export function IssueActivityChart({
  issueActivity,
  openIssuesPercent,
}: IssueActivityChartProps) {
  const chartData = useMemo(
    () => addWeekLabels(issueActivity ?? []),
    [issueActivity],
  );

  // Calculate totals for the stat display
  const totals = useMemo(() => {
    if (!issueActivity) return { opened: 0, closed: 0 };
    return issueActivity.reduce(
      (acc, item) => ({
        opened: acc.opened + item.opened,
        closed: acc.closed + item.closed,
      }),
      { opened: 0, closed: 0 },
    );
  }, [issueActivity]);

  const hasData = issueActivity?.some((w) => w.opened > 0 || w.closed > 0);

  const statText =
    openIssuesPercent !== null ? `${openIssuesPercent}% open` : "No issues";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Issue Activity (1yr)</span>
          <span className="text-muted-foreground font-normal">{statText}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={chartData} margin={{ left: 0, right: 0 }}>
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
                        return `Week of ${format(new Date(payload[0].payload.week), "MMM d, yyyy")}`;
                      }
                      return "";
                    }}
                  />
                }
              />
              <Bar
                dataKey="opened"
                fill="var(--color-opened)"
                radius={[2, 2, 0, 0]}
                stackId="issues"
              />
              <Bar
                dataKey="closed"
                fill="var(--color-closed)"
                radius={[2, 2, 0, 0]}
                stackId="issues"
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No issue activity found
          </div>
        )}
        {hasData && (
          <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: "oklch(0.65 0.15 25)" }}
              />
              <span>Opened ({totals.opened})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: "oklch(0.7 0.15 145)" }}
              />
              <span>Closed ({totals.closed})</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
