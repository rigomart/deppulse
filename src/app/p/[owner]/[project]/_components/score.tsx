"use client";

import { Clock } from "lucide-react";
import { LocalDate } from "@/components/local-date";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { computeConfidence } from "@/core/confidence";
import { computeScoreFromMetrics } from "@/core/maintenance";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { CategoryInfoPopover } from "./category-info-popover";
import { ConfidenceIndicator } from "./confidence-indicator";

interface ScoreProps {
  run: AnalysisRun;
}

export function Score({ run }: ScoreProps) {
  if (!run.metrics) {
    return (
      <Card className="bg-surface-3 w-full sm:w-auto min-w-64">
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Maintenance Score</p>
              <p className="text-xl font-semibold text-foreground">--/100</p>
            </div>
            <Badge className="capitalize text-sm border bg-muted text-muted-foreground">
              No data
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { score, category } = computeScoreFromMetrics(run.metrics);
  const confidence = computeConfidence(run);
  const analyzedAt = run.completedAt ?? run.startedAt;

  return (
    <Card className="bg-surface-3 w-full sm:w-auto min-w-64">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Maintenance Score</p>
            <p className="text-xl font-semibold text-foreground">{score}/100</p>
          </div>
          <CategoryInfoPopover category={category} />
        </div>
        <Separator />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3 opacity-70" />
          <span>
            Analyzed: <LocalDate date={analyzedAt} />
          </span>
        </div>
        <ConfidenceIndicator confidence={confidence} />
      </CardContent>
    </Card>
  );
}
