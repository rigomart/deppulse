"use client";

import { format, formatDistanceToNow } from "date-fns";
import { Container } from "@/components/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { formatNumber } from "@/lib/utils";

interface ComparisonTableProps {
  runA: AnalysisRun;
  runB: AnalysisRun;
}

type BetterDirection = "higher" | "lower" | "newer";
type Section = "freshness" | "engagement" | "health" | "activity";

interface MetricRow {
  label: string;
  section: Section;
  valueA: string;
  valueB: string;
  rawA: number | null;
  rawB: number | null;
  better: BetterDirection;
}

function formatDate(iso: string | null): string {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return `${format(d, "MMM d, yyyy")} (${formatDistanceToNow(d, { addSuffix: true })})`;
}

function fmtCount(val: number | null): string {
  if (val === null) return "N/A";
  return formatNumber(val);
}

function fmtPercent(val: number | null): string {
  if (val === null) return "N/A";
  return `${val}%`;
}

function fmtDays(val: number | null): string {
  if (val === null) return "N/A";
  return `${val}d`;
}

function getWinner(
  rawA: number | null,
  rawB: number | null,
  better: BetterDirection,
): "a" | "b" | "tie" | "none" {
  if (rawA === null || rawB === null) return "none";
  if (rawA === rawB) return "tie";
  if (better === "higher" || better === "newer") {
    return rawA > rawB ? "a" : "b";
  }
  return rawA < rawB ? "a" : "b";
}

function ComparisonRow({ row }: { row: MetricRow }) {
  const winner = getWinner(row.rawA, row.rawB, row.better);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2.5 border-b border-border/50 last:border-b-0">
      <p
        className={`text-sm text-right ${winner === "a" ? "text-foreground font-semibold" : "text-muted-foreground"}`}
      >
        {row.valueA}
      </p>
      <p className="text-xs text-muted-foreground text-center min-w-24 sm:min-w-32">
        {row.label}
      </p>
      <p
        className={`text-sm text-left ${winner === "b" ? "text-foreground font-semibold" : "text-muted-foreground"}`}
      >
        {row.valueB}
      </p>
    </div>
  );
}

function buildRows(runA: AnalysisRun, runB: AnalysisRun): MetricRow[] {
  const mA = runA.metrics;
  const mB = runB.metrics;

  const dateToRaw = (iso: string | null): number | null =>
    iso ? new Date(iso).getTime() : null;

  return [
    {
      label: "Last Commit",
      section: "freshness",
      valueA: formatDate(mA?.lastCommitAt ?? null),
      valueB: formatDate(mB?.lastCommitAt ?? null),
      rawA: dateToRaw(mA?.lastCommitAt ?? null),
      rawB: dateToRaw(mB?.lastCommitAt ?? null),
      better: "newer",
    },
    {
      label: "Last Release",
      section: "freshness",
      valueA: formatDate(mA?.lastReleaseAt ?? null),
      valueB: formatDate(mB?.lastReleaseAt ?? null),
      rawA: dateToRaw(mA?.lastReleaseAt ?? null),
      rawB: dateToRaw(mB?.lastReleaseAt ?? null),
      better: "newer",
    },
    {
      label: "Last PR Merged",
      section: "freshness",
      valueA: formatDate(mA?.lastMergedPrAt ?? null),
      valueB: formatDate(mB?.lastMergedPrAt ?? null),
      rawA: dateToRaw(mA?.lastMergedPrAt ?? null),
      rawB: dateToRaw(mB?.lastMergedPrAt ?? null),
      better: "newer",
    },
    {
      label: "Last Issue Closed",
      section: "freshness",
      valueA: formatDate(mA?.lastClosedIssueAt ?? null),
      valueB: formatDate(mB?.lastClosedIssueAt ?? null),
      rawA: dateToRaw(mA?.lastClosedIssueAt ?? null),
      rawB: dateToRaw(mB?.lastClosedIssueAt ?? null),
      better: "newer",
    },
    {
      label: "Stars",
      section: "engagement",
      valueA: fmtCount(mA?.stars ?? null),
      valueB: fmtCount(mB?.stars ?? null),
      rawA: mA?.stars ?? null,
      rawB: mB?.stars ?? null,
      better: "higher",
    },
    {
      label: "Forks",
      section: "engagement",
      valueA: fmtCount(mA?.forks ?? null),
      valueB: fmtCount(mB?.forks ?? null),
      rawA: mA?.forks ?? null,
      rawB: mB?.forks ?? null,
      better: "higher",
    },
    {
      label: "Open Issues %",
      section: "health",
      valueA: fmtPercent(mA?.openIssuesPercent ?? null),
      valueB: fmtPercent(mB?.openIssuesPercent ?? null),
      rawA: mA?.openIssuesPercent ?? null,
      rawB: mB?.openIssuesPercent ?? null,
      better: "lower",
    },
    {
      label: "Resolution Time",
      section: "health",
      valueA: fmtDays(mA?.medianIssueResolutionDays ?? null),
      valueB: fmtDays(mB?.medianIssueResolutionDays ?? null),
      rawA: mA?.medianIssueResolutionDays ?? null,
      rawB: mB?.medianIssueResolutionDays ?? null,
      better: "lower",
    },
    {
      label: "Open PRs",
      section: "health",
      valueA: fmtCount(mA?.openPrsCount ?? null),
      valueB: fmtCount(mB?.openPrsCount ?? null),
      rawA: mA?.openPrsCount ?? null,
      rawB: mB?.openPrsCount ?? null,
      better: "lower",
    },
    {
      label: "Commits (90d)",
      section: "activity",
      valueA: fmtCount(mA?.commitsLast90Days ?? null),
      valueB: fmtCount(mB?.commitsLast90Days ?? null),
      rawA: mA?.commitsLast90Days ?? null,
      rawB: mB?.commitsLast90Days ?? null,
      better: "higher",
    },
    {
      label: "Merged PRs (90d)",
      section: "activity",
      valueA: fmtCount(mA?.mergedPrsLast90Days ?? null),
      valueB: fmtCount(mB?.mergedPrsLast90Days ?? null),
      rawA: mA?.mergedPrsLast90Days ?? null,
      rawB: mB?.mergedPrsLast90Days ?? null,
      better: "higher",
    },
    {
      label: "Issues Created (1yr)",
      section: "activity",
      valueA: fmtCount(mA?.issuesCreatedLastYear ?? null),
      valueB: fmtCount(mB?.issuesCreatedLastYear ?? null),
      rawA: mA?.issuesCreatedLastYear ?? null,
      rawB: mB?.issuesCreatedLastYear ?? null,
      better: "higher",
    },
  ];
}

function SectionHeader({ nameA, nameB }: { nameA: string; nameB: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 pb-2 border-b border-border">
      <p className="text-xs font-semibold text-foreground text-right truncate">
        {nameA}
      </p>
      <p className="text-xs text-muted-foreground text-center min-w-24 sm:min-w-32">
        Metric
      </p>
      <p className="text-xs font-semibold text-foreground text-left truncate">
        {nameB}
      </p>
    </div>
  );
}

export function ComparisonTable({ runA, runB }: ComparisonTableProps) {
  const rows = buildRows(runA, runB);

  const nameA = runA.repository.fullName;
  const nameB = runB.repository.fullName;

  const sections: { title: string; key: Section }[] = [
    { title: "Activity Freshness", key: "freshness" },
    { title: "Engagement", key: "engagement" },
    { title: "Health", key: "health" },
    { title: "Activity Volume", key: "activity" },
  ];

  return (
    <Container>
      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SectionHeader nameA={nameA} nameB={nameB} />
              {rows
                .filter((row) => row.section === section.key)
                .map((row) => (
                  <ComparisonRow key={row.label} row={row} />
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}
