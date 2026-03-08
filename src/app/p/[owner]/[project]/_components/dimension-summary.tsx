import { Clock } from "lucide-react";
import { LocalDate } from "@/components/local-date";
import { Separator } from "@/components/ui/separator";
import { computeConfidence } from "@/core/confidence";
import {
  computeDimensions,
  type DimensionId,
  type DimensionLevel,
} from "@/core/dimensions";
import { dimensionLevelFillColors } from "@/lib/category-styles";
import { type AnalysisRun, getAnalysisTime } from "@/lib/domain/assessment";
import { cn } from "@/lib/utils";
import { ConfidenceIndicator } from "./confidence-indicator";

const filledSegments: Record<DimensionLevel, number> = {
  strong: 4,
  adequate: 3,
  weak: 2,
  inactive: 1,
};

function SegmentedBar({ level }: { level: DimensionLevel }) {
  const filled = filledSegments[level];
  const fillColor = dimensionLevelFillColors[level];

  return (
    <div
      className="rounded-full border border-primary p-0.5"
      role="img"
      aria-label={level}
    >
      <div className="flex gap-0.5 overflow-hidden rounded-full">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={`segment-${i}`}
            className={cn(
              "h-2 w-5 transition-colors",
              i < filled ? fillColor : "bg-muted/30",
            )}
          />
        ))}
      </div>
    </div>
  );
}

const dimensionLabels: Record<DimensionId, string> = {
  "development-activity": "Development Activity",
  "issue-management": "Issue Management",
  "release-cadence": "Release Cadence",
};

interface DimensionSummaryProps {
  run: AnalysisRun;
  now: Date;
}

export function DimensionSummary({ run, now }: DimensionSummaryProps) {
  if (!run.metrics) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Health Dimensions</p>
        <p className="text-sm text-foreground">No data available</p>
      </div>
    );
  }

  const analysisTime = getAnalysisTime(run);
  const dimensions = computeDimensions(run.metrics, analysisTime);
  const confidence = computeConfidence(run, now);

  const rows = [
    dimensions.developmentActivity,
    dimensions.issueManagement,
    dimensions.releaseCadence,
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {rows.map((dim) => (
          <div
            key={dim.dimension}
            className="flex items-center justify-between gap-4"
          >
            <span className="text-sm text-muted-foreground">
              {dimensionLabels[dim.dimension]}
            </span>
            <SegmentedBar level={dim.level} />
          </div>
        ))}
      </div>
      <Separator />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="size-3 opacity-70" />
        <span>
          Analyzed: <LocalDate date={analysisTime.getTime()} />
        </span>
      </div>
      <ConfidenceIndicator confidence={confidence} />
    </div>
  );
}
