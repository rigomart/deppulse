import { fetchQuery } from "convex/nextjs";
import { Code2, Star } from "lucide-react";
import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/container";
import { Card, CardContent } from "@/components/ui/card";
import { computeDimensions, type DimensionLevel } from "@/core/dimensions";
import { dimensionLevelFillColors } from "@/lib/category-styles";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { getAnalysisTime } from "@/lib/domain/assessment";
import { cn, formatNumber } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

const filledSegments: Record<DimensionLevel, number> = {
  strong: 4,
  adequate: 3,
  weak: 2,
  inactive: 1,
};

function MiniBar({ level, label }: { level: DimensionLevel; label: string }) {
  const filled = filledSegments[level];
  const fillColor = dimensionLevelFillColors[level];

  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-muted-foreground w-12 text-right">
        {label}
      </span>
      <div className="flex gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={`segment-${i}`}
            className={cn(
              "h-1 w-2 rounded",
              i < filled ? fillColor : "bg-muted/30",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export async function RecentAnalyses() {
  "use cache";
  cacheLife("minutes");

  const recentRuns = (await fetchQuery(api.analysisRuns.listRecentCompleted, {
    limit: 12,
  })) as AnalysisRun[];

  if (recentRuns.length === 0) {
    return null;
  }

  return (
    <section className="animate-in fade-in duration-300 delay-200 fill-mode-backwards">
      <Container className="py-8 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Recent Analyses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0.5">
          {recentRuns.map((run) => {
            const dimensions = run.metrics
              ? computeDimensions(run.metrics, getAnalysisTime(run))
              : null;

            return (
              <Link
                key={run.id}
                href={`/p/${run.repository.owner}/${run.repository.name}`}
                prefetch
              >
                <Card className="h-full transition-all bg-surface-1 p-0 border-muted/50 hover:bg-surface-2">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {run.metrics?.avatarUrl && (
                            <Image
                              src={run.metrics.avatarUrl}
                              alt={`${run.repository.owner} avatar`}
                              width={20}
                              height={20}
                              className="rounded-full shrink-0"
                            />
                          )}
                          <div className="text-base font-medium truncate">
                            {run.repository.fullName}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {formatNumber(run.metrics?.stars ?? 0)}
                          </span>
                          {run.metrics?.language && (
                            <span className="flex items-center gap-1">
                              <Code2 className="w-3 h-3" />
                              {run.metrics.language}
                            </span>
                          )}
                        </div>
                      </div>
                      {dimensions && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <MiniBar
                            level={dimensions.developmentActivity.level}
                            label="Activity"
                          />
                          <MiniBar
                            level={dimensions.issueManagement.level}
                            label="Issues"
                          />
                          <MiniBar
                            level={dimensions.releaseCadence.level}
                            label="Releases"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
