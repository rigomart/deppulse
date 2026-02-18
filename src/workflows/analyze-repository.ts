import { processAnalysisRun } from "@/core/analysis-v2";

export async function analyzeRepositoryWorkflow(
  runId: number,
  lockToken: string | null,
) {
  "use workflow";

  await processRunStep(runId, lockToken);
}

async function processRunStep(runId: number, lockToken: string | null) {
  "use step";

  await processAnalysisRun(runId, lockToken);
}
