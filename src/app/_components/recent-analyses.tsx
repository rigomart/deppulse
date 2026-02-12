import "server-only";

import { Code2, Star } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HOMEPAGE_CACHE_LIFE } from "@/lib/cache/analysis-cache";
import { getRecentAnalysesTag } from "@/lib/cache/tags";
import { categoryColors } from "@/lib/category-styles";
import { computeScoreFromMetrics } from "@/lib/maintenance";
import { listRecentCompletedAssessments } from "@/lib/services/assessment";
import { formatNumber } from "@/lib/utils";

export async function RecentAnalyses() {
  "use cache";
  cacheLife(HOMEPAGE_CACHE_LIFE);
  cacheTag(getRecentAnalysesTag());

  const recentRuns = await listRecentCompletedAssessments(12);

  if (recentRuns.length === 0) {
    return null;
  }

  return (
    <section className="animate-in fade-in duration-300 delay-200 fill-mode-backwards">
      <Container className="py-8 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Recent Analyses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentRuns.map((run) => {
            const category = run.metrics
              ? computeScoreFromMetrics(run.metrics).category
              : "inactive";
            return (
              <Link
                key={run.id}
                href={`/p/${run.repository.owner}/${run.repository.name}`}
              >
                <Card className="h-full transition-all hover:bg-surface-3">
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {run.metrics?.avatarUrl && (
                          <Image
                            src={run.metrics.avatarUrl}
                            alt={`${run.repository.owner} avatar`}
                            width={24}
                            height={24}
                            className="rounded-full shrink-0"
                          />
                        )}
                        <div className="text-base font-medium truncate">
                          {run.repository.fullName}
                        </div>
                      </div>
                      <Badge
                        className={`capitalize shrink-0 border ${categoryColors[category]}`}
                      >
                        {category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" />
                        {formatNumber(run.metrics?.stars ?? 0)}
                      </span>
                      {run.metrics?.language && (
                        <span className="flex items-center gap-1">
                          <Code2 className="w-3.5 h-3.5" />
                          {run.metrics.language}
                        </span>
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
