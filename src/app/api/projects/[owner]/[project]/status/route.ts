import { getProjectAnalysisStatus } from "@/core/analysis-v2";

export async function GET(
  _request: Request,
  context: { params: Promise<{ owner: string; project: string }> },
) {
  const { owner, project } = await context.params;
  const status = await getProjectAnalysisStatus(owner, project);

  const latestRun = status.latestRun;
  if (!latestRun) {
    return Response.json({
      repository: status.repository,
      latestRun: null,
      viewReady: status.viewReady,
    });
  }

  return Response.json({
    repository: status.repository,
    latestRun: {
      id: latestRun.id,
      state: latestRun.runState ?? latestRun.status,
      progressStep: latestRun.progressStep ?? "finalize",
      attemptCount: latestRun.attemptCount ?? 0,
      updatedAt: (latestRun.updatedAt ?? latestRun.startedAt).toISOString(),
      errorMessage: latestRun.errorMessage,
    },
    viewReady: status.viewReady,
  });
}
