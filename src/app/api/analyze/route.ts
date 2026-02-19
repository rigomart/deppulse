import { after } from "next/server";
import {
  primeRunWithBaseMetrics,
  startOrReuseAnalysisRun,
  triggerAnalysisRunProcessing,
} from "@/core/analysis";
import { parseProject } from "@/lib/parse-project";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    query?: unknown;
    force?: unknown;
  } | null;
  const query = typeof payload?.query === "string" ? payload.query : null;
  const force = typeof payload?.force === "boolean" ? payload.force : undefined;

  if (!query) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsedProject = parseProject(query);
  if (!parsedProject) {
    return Response.json(
      {
        error:
          "Invalid repository format. Use owner/repository or a GitHub URL.",
      },
      { status: 400 },
    );
  }

  const { run, created } = await startOrReuseAnalysisRun({
    owner: parsedProject.owner,
    project: parsedProject.project,
    force,
    triggerSource: "homepage",
  });

  const primedRun =
    (created || (!run.metrics && run.progressStep === "bootstrap")
      ? await primeRunWithBaseMetrics(run.id, run.lockToken ?? null).catch(
          () => run,
        )
      : run) ?? run;

  if (created) {
    after(async () => {
      await triggerAnalysisRunProcessing({
        runId: primedRun.id,
        lockToken: primedRun.lockToken ?? null,
      });
    });
  }

  return Response.json({
    repository: {
      owner: primedRun.repository.owner,
      project: primedRun.repository.name,
      fullName: primedRun.repository.fullName,
    },
    run: {
      id: primedRun.id,
      state: primedRun.runState ?? primedRun.status,
      startedAt: primedRun.startedAt.toISOString(),
    },
    redirectTo: `/p/${primedRun.repository.owner}/${primedRun.repository.name}`,
  });
}
