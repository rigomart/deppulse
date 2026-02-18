import { processAnalysisRun } from "@/core/analysis-v2";

function isAuthorized(request: Request): boolean {
  const token = process.env.ANALYSIS_V2_WORKFLOW_TOKEN;
  if (!token) return true;
  const header = request.headers.get("authorization");
  return header === `Bearer ${token}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    runId?: unknown;
    lockToken?: unknown;
  } | null;
  const runId = typeof payload?.runId === "number" ? payload.runId : null;
  const lockToken =
    typeof payload?.lockToken === "string" ? payload.lockToken : null;

  if (!runId || !Number.isInteger(runId) || runId <= 0) {
    return Response.json({ error: "Invalid runId" }, { status: 400 });
  }

  await processAnalysisRun(runId, lockToken);
  return Response.json({ ok: true, runId });
}
