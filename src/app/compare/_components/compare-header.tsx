import Link from "next/link";
import { Container } from "@/components/container";
import { RepositoryStats } from "@/components/repository-stats";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { computeScoreFromMetrics } from "@/core/maintenance";
import { categoryColors } from "@/lib/category-styles";
import type { AnalysisRun } from "@/lib/domain/assessment";

interface CompareHeaderProps {
  runA: AnalysisRun;
  runB: AnalysisRun;
}

function ProjectCard({ run }: { run: AnalysisRun }) {
  const metrics = run.metrics;
  const result = metrics ? computeScoreFromMetrics(metrics) : null;

  return (
    <Card className="flex-1 min-w-0">
      <CardContent className="space-y-3">
        <RepositoryStats run={run} size="compact" />

        {result && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  Maintenance Score
                </p>
                <p className="text-xl font-semibold">{result.score}/100</p>
              </div>
              <Badge
                className={`capitalize text-sm border ${categoryColors[result.category]}`}
              >
                {result.category}
              </Badge>
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
