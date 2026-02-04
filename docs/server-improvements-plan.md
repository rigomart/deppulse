# Server-Side Improvement Plan

Date: 2026-02-03
Scope: architecture, performance, data flow, efficiency (server-side). No changes implemented yet.

Legend: Impact = effect on user-visible latency, correctness, or infra cost. Complexity = estimated engineering effort and risk.
Each item includes: rationale, suggested approach, affected areas, and risks/notes.

1. Split analysis execution from cached renders
Impact: High
Complexity: High
Quick win: No
Rationale: `ensureScoreCompletion()` mutates DB + calls GitHub inside `"use cache"` components. Cache components should be read-only to avoid inconsistent or surprising caching behavior.
Suggested approach:
- Create a server action or background job that performs analysis and writes results.
- Rendering path only reads the latest run.
- Trigger revalidation (`revalidateTag` / `updateTag`) from the action/job.
Affected areas:
- `src/lib/services/assessment-service.ts` (split read vs. write responsibilities)
- `src/app/p/[owner]/[project]/_components/score.tsx`
- `src/app/p/[owner]/[project]/_components/commit-chart-content.tsx`
Risks/notes:
- Requires product decision on when analysis runs (on submit vs. manual refresh).
- Might require a job runner if analysis is too slow for a request.

2. Align cache TTL with freshness window
Impact: High
Complexity: Low
Quick win: Yes
Rationale: `cacheLife("weeks")` and `CACHE_REVALIDATE_SECONDS` are inconsistent. Cached output may persist longer than intended.
Suggested approach:
- Decide a freshness target (e.g., 7 days).
- Apply a consistent `cacheLife(...)` across page + subcomponents.
Affected areas:
- `src/app/p/[owner]/[project]/page.tsx`
- `src/app/p/[owner]/[project]/_components/score.tsx`
- `src/app/p/[owner]/[project]/_components/commit-chart-content.tsx`
- `src/app/p/[owner]/[project]/layout.tsx`
Risks/notes:
- Tightening TTL increases GitHub API usage and DB load.

3. Guard against duplicate concurrent runs
Impact: High
Complexity: Medium
Quick win: No
Rationale: Two concurrent requests can both create new runs for the same repo when the latest run is stale.
Suggested approach:
- Reuse an existing `score_pending` run if present.
- Or add a DB advisory lock keyed by repository id.
- Or enforce uniqueness for “active run” (application-level invariant).
Affected areas:
- `src/lib/services/assessment-service.ts`
- `src/lib/persistence/analysis-run-repo.ts`
Risks/notes:
- Must avoid blocking too long in serverless environments.

4. Normalize owner/repo casing and canonicalize slugs
Impact: Medium
Complexity: Low
Quick win: Yes
Rationale: Case variations can create duplicate rows and cache tags. Example: `Facebook/React` vs `facebook/react`.
Suggested approach:
- Normalize input to lower-case.
- Or use GitHub’s canonical name and redirect to it.
Affected areas:
- `src/lib/parse-project.ts`
- `src/app/_components/search-form.tsx`
- `src/lib/services/assessment-service.ts` (use canonical name from metrics)
Risks/notes:
- If you choose canonical naming, ensure redirects happen before caching tags.

5. Reduce DB round-trips in run creation/updates
Impact: Medium
Complexity: Medium
Quick win: No
Rationale: `createRun()` and `updateRun()` insert/update then re-fetch, adding latency and DB load.
Suggested approach:
- Return required fields from `insert/update ... returning` and map to domain in-process.
- If repository data is required, join or fetch once at a higher level.
Affected areas:
- `src/lib/persistence/analysis-run-repo.ts`
Risks/notes:
- Requires careful mapper updates to avoid mismatched domain types.

6. Add index for recent completed runs
Impact: Medium
Complexity: Medium
Quick win: No
Rationale: `getRecentCompletedRuns()` filters by `status` and orders by `completedAt`. No optimal index exists for this pattern.
Suggested approach:
- Add a composite index `(status, completed_at desc)`.
Affected areas:
- `src/db/schema.ts` and a migration under `migrations/`
Risks/notes:
- Requires migration and deployment; low risk but must coordinate with Vercel/Neon flow.

7. Cache recent analyses on the home page
Impact: Medium
Complexity: Low
Quick win: Yes
Rationale: `RecentAnalyses()` hits DB on every request.
Suggested approach:
- Add `"use cache"` and a short `cacheLife` (e.g., minutes or hours).
Affected areas:
- `src/app/_components/recent-analyses.tsx`
Risks/notes:
- Small staleness on the homepage is usually acceptable.

8. Move commit activity collection off the render path
Impact: Medium
Complexity: Medium
Quick win: No
Rationale: REST 202 retry loop can delay rendering and reduce streaming benefits.
Suggested approach:
- Precompute in background after metrics fetch, or
- Serve stale commit activity and refresh asynchronously.
Affected areas:
- `src/lib/github/activity.ts`
- `src/lib/services/assessment-service.ts`
- `src/app/p/[owner]/[project]/_components/commit-chart-content.tsx`
Risks/notes:
- Requires managing freshness and eventual consistency on charts.

9. Cross-instance dedupe for commit activity
Impact: Low
Complexity: Medium
Quick win: No
Rationale: In-memory dedupe only works per instance; serverless can multiply calls.
Suggested approach:
- Store a short-lived “in progress” marker in DB/cache and respect it across instances.
Affected areas:
- `src/lib/github/activity.ts`
- DB or cache layer (new table or Redis, if available)
Risks/notes:
- Adds infra dependency if you don’t already have shared cache.

10. Improve issue metrics accuracy for high-volume repos
Impact: Low
Complexity: Medium
Quick win: No
Rationale: Using only the latest 100 issues can skew velocity and resolution metrics for high-activity repositories.
Suggested approach:
- Use GitHub search API with a date range, or paginate more issues with a cap.
Affected areas:
- `src/lib/github/metrics.ts`
Risks/notes:
- Increased API cost and complexity; must respect rate limits.

11. Refine cache tags for more granular invalidation
Impact: Low
Complexity: Low
Quick win: Yes
Rationale: Single project tag invalidates multiple independent pieces and increases cache churn.
Suggested approach:
- Add tags by data type (`project-score:`, `project-activity:`) while keeping a project-wide tag for broad updates.
Affected areas:
- `src/lib/cache/tags.ts`
- Cache component usages in project page and subcomponents
Risks/notes:
- More tags to manage; must be consistent in invalidation logic.
