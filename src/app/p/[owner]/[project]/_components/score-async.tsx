import "server-only";

import { ensureScoreCompletion } from "@/lib/services/assessment-service";
import { ScoreDisplay } from "./score-display";

interface ScoreAsyncProps {
  owner: string;
  project: string;
}

export async function ScoreAsync({ owner, project }: ScoreAsyncProps) {
  const run = await ensureScoreCompletion(owner, project);

  if (run.score === null) {
    throw new Error("Score not available");
  }

  const analyzedAt = run.completedAt ?? run.startedAt;

  return <ScoreDisplay score={run.score} analyzedAt={analyzedAt} />;
}
