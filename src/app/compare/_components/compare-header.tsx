import Link from "next/link";
import { Container } from "@/components/container";
import { RepositoryStats } from "@/components/repository-stats";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  computeDimensions,
  type DimensionId,
  type DimensionLevel,
} from "@/core/dimensions";
import { dimensionLevelFillColors } from "@/lib/category-styles";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { getAnalysisTime } from "@/lib/domain/assessment";
import { cn } from "@/lib/utils";

interface CompareHeaderProps {
  runA: AnalysisRun;
  runB: AnalysisRun;
}

const filledSegments: Record<DimensionLevel, number> = {
  strong: 4,
  adequate: 3,
  weak: 2,
  inactive: 1,
};

const dimensionLabels: Record<DimensionId, string> = {
  "development-activity": "Dev Activity",
  "issue-management": "Issues",
  "release-cadence": "Releases",
};

function CompactBar({ level }: { level: DimensionLevel }) {
  const filled = filledSegments[level];
  const fillColor = dimensionLevelFillColors[level];

  return (
    <div className="flex gap-0.5 overflow-hidden rounded-full">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={`segment-${i}`}
          className={cn(
            "h-1.5 w-4 transition-colors",
            i < filled ? fillColor : "bg-muted/30",
          )}
        />
      ))}
    </div>
  );
}

function ProjectCard({ run }: { run: AnalysisRun }) {
  const metrics = run.metrics;
  const dimensions =
    metrics && computeDimensions(metrics, getAnalysisTime(run));

  const rows = dimensions
    ? [
        dimensions.developmentActivity,
        dimensions.issueManagement,
        dimensions.releaseCadence,
      ]
    : null;

  return (
    <Card className="flex-1 min-w-0">
      <CardContent className="space-y-3">
        <RepositoryStats run={run} size="compact" />

        {rows && (
          <>
            <Separator />
            <div className="space-y-1.5">
              {rows.map((dim) => (
                <div
                  key={dim.dimension}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-xs text-muted-foreground">
                    {dimensionLabels[dim.dimension]}
                  </span>
                  <CompactBar level={dim.level} />
                </div>
              ))}
            </div>
            <Link
              href={`/p/${run.repository.owner}/${run.repository.name}`}
              className="text-xs text-muted-foreground hover:underline"
            >
              View full analysis &rarr;
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CompareHeader({ runA, runB }: CompareHeaderProps) {
  return (
    <Container>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProjectCard run={runA} />
        <ProjectCard run={runB} />
      </div>
    </Container>
  );
}
