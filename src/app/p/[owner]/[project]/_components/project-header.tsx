import { Suspense } from "react";
import { Container } from "@/components/container";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { ProjectInfo } from "./project-info";
import { Score } from "./score";

function ScoreSkeleton() {
  return (
    <Card className="bg-surface-3 w-full sm:w-auto min-w-64">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
            <div className="h-6 w-16 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-6 w-20 rounded bg-muted animate-pulse" />
        </div>
        <Separator />
        <div className="h-3.5 w-36 rounded bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}

interface ProjectHeaderProps {
  run: AnalysisRun;
}

export function ProjectHeader({ run }: ProjectHeaderProps) {
  return (
    <section className="bg-surface-2">
      <Container className="py-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between animate-in fade-in slide-in-from-bottom-1 duration-300">
          <ProjectInfo run={run} />

          <div className="flex items-start">
            <Suspense fallback={<ScoreSkeleton />}>
              <Score run={run} />
            </Suspense>
          </div>
        </div>
      </Container>
    </section>
  );
}
