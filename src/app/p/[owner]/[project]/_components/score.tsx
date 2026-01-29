import "server-only";

import { Clock } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import { LocalDate } from "@/components/local-date";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getProjectTag } from "@/lib/cache/tags";
import { categoryColors } from "@/lib/category-styles";
import { getCategoryFromScore } from "@/lib/maintenance";
import { ensureScoreCompletion } from "@/lib/services/assessment-service";

interface ScoreProps {
  runId: number;
  owner: string;
  project: string;
}

export async function Score({ runId, owner, project }: ScoreProps) {
  "use cache";
  cacheLife("weeks");
  cacheTag(getProjectTag(owner, project));

  const run = await ensureScoreCompletion(owner, project, runId);

  if (run.score === null) {
    throw new Error("Score not available");
  }

  const score = run.score;
  const category = getCategoryFromScore(score);
  const analyzedAt = run.completedAt ?? run.startedAt;

  return (
    <Card className="bg-surface-3 w-full sm:w-auto min-w-64">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Maintenance Score</p>
            <p className="text-xl font-semibold text-foreground">{score}/100</p>
          </div>
          <Badge
            className={`capitalize text-sm border ${categoryColors[category]}`}
          >
            {category}
          </Badge>
        </div>
        <Separator />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3 opacity-70" />
          <span>
            Analyzed: <LocalDate date={analyzedAt} />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
