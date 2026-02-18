import { runFallbackRetryScan } from "@/core/analysis-v2";

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
    limit?: unknown;
  } | null;
  const limit =
    typeof payload?.limit === "number" && Number.isInteger(payload.limit)
      ? Math.min(Math.max(payload.limit, 1), 100)
      : 10;

  const processed = await runFallbackRetryScan(limit);
  return Response.json({ ok: true, processed });
}
