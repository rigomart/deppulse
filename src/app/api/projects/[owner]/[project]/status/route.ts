import { getProjectAnalysisStatus } from "@/core/analysis";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  context: { params: Promise<{ owner: string; project: string }> },
) {
  try {
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
        progressStep: latestRun.progressStep ?? "bootstrap",
        attemptCount: latestRun.attemptCount ?? 0,
        updatedAt: (latestRun.updatedAt ?? latestRun.startedAt).toISOString(),
        errorMessage: latestRun.errorMessage,
      },
      viewReady: status.viewReady,
    });
  } catch (error) {
    logger.error("Failed to fetch project status", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "Failed to fetch project status" },
      { status: 500 },
    );
  }
}
