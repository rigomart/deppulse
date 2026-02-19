import { FatalError, getStepMetadata, RetryableError } from "workflow";
import { COMMIT_ACTIVITY_MAX_ATTEMPTS } from "@/core/analysis/constants";

export async function analyzeRepositoryWorkflow(
  runId: number,
  lockToken: string | null,
) {
  "use workflow";

  const run = await primeRunStep(runId, lockToken);
  if (!run || run.terminal) return;

  const commitOutcome = await resolveCommitActivityStep(runId);
  await finalizeRunStep(runId, commitOutcome);
}

async function primeRunStep(runId: number, lockToken: string | null) {
  "use step";

  const { primeRunWithBaseMetrics } = await import("@/core/analysis");
  const run = await primeRunWithBaseMetrics(runId, lockToken);
  if (!run) {
    throw new FatalError("Analysis run not found.");
  }

  return {
    terminal:
      run.runState === "complete" ||
      run.runState === "failed" ||
      run.runState === "partial",
  };
}

async function resolveCommitActivityStep(runId: number) {
  "use step";

  const metadata = getStepMetadata();
  const { attemptCommitActivityFetch } = await import(
    "@/core/analysis/processor"
  );
  const outcome = await attemptCommitActivityFetch(runId, metadata.attempt);

  if (outcome.type === "retry") {
    throw new RetryableError("Commit activity still processing on GitHub.", {
      retryAfter: `${outcome.delaySeconds}s`,
    });
  }

  return outcome;
}
resolveCommitActivityStep.maxRetries = COMMIT_ACTIVITY_MAX_ATTEMPTS - 1;

async function finalizeRunStep(
  runId: number,
  outcome: Awaited<ReturnType<typeof resolveCommitActivityStep>>,
) {
  "use step";

  const { finalizeRunFromCommitOutcome } = await import(
    "@/core/analysis/processor"
  );

  if (outcome.type === "success") {
    await finalizeRunFromCommitOutcome({
      runId,
      status: "complete",
      snapshot: outcome.snapshot,
      attempts: outcome.attempts,
    });
    return;
  }

  await finalizeRunFromCommitOutcome({
    runId,
    status: "partial",
    snapshot: outcome.snapshot,
    attempts: outcome.attempts,
    errorCode: outcome.errorCode,
    errorMessage: outcome.errorMessage,
  });
}
