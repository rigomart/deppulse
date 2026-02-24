import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { Container } from "@/components/container";
import { computeScoreFromMetrics } from "@/core/maintenance";
import type { AnalysisRun } from "@/lib/domain/assessment";
import { parseProject } from "@/lib/parse-project";
import { api } from "../../../convex/_generated/api";
import { CommitActivityComparison } from "./_components/commit-activity-comparison";
import { CompareForm } from "./_components/compare-form";
import { CompareHeader } from "./_components/compare-header";
import { ComparisonTable } from "./_components/comparison-table";

type SearchParams = Promise<{ a?: string; b?: string }>;

function normalizeSlug(raw: string | undefined) {
  if (!raw) return null;
  const parsed = parseProject(raw);
  if (!parsed) return null;
  const owner = parsed.owner.toLowerCase();
  const project = parsed.project.toLowerCase();
  return { slug: `${owner}/${project}`, owner, project };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { a, b } = await searchParams;
  const normA = normalizeSlug(a);
  const normB = normalizeSlug(b);

  if (!normA || !normB) {
    return {
      title: "Compare Projects",
      description:
        "Compare two GitHub repositories side-by-side — scores, activity, engagement, and health metrics.",
      alternates: { canonical: "/compare" },
    };
  }

  let runA = null;
  let runB = null;
  try {
    [runA, runB] = await Promise.all([
      fetchQuery(api.analysisRuns.getByRepositorySlug, {
        owner: normA.owner,
        project: normA.project,
      }),
      fetchQuery(api.analysisRuns.getByRepositorySlug, {
        owner: normB.owner,
        project: normB.project,
      }),
    ]);
  } catch {
    return {
      title: `Compare ${normA.slug} vs ${normB.slug}`,
      description: `Side-by-side comparison of ${normA.slug} and ${normB.slug}.`,
      alternates: { canonical: `/compare?a=${normA.slug}&b=${normB.slug}` },
    };
  }

  const parts: string[] = [];
  if (runA?.metrics) {
    const { score } = computeScoreFromMetrics(runA.metrics);
    parts.push(`${normA.slug} (${score}/100)`);
  } else {
    parts.push(normA.slug);
  }
  if (runB?.metrics) {
    const { score } = computeScoreFromMetrics(runB.metrics);
    parts.push(`${normB.slug} (${score}/100)`);
  } else {
    parts.push(normB.slug);
  }

  return {
    title: `Compare ${normA.slug} vs ${normB.slug}`,
    description: `Side-by-side comparison of ${parts.join(" and ")}.`,
    alternates: { canonical: `/compare?a=${normA.slug}&b=${normB.slug}` },
  };
}

async function CachedComparePage({
  a,
  b,
}: {
  a: string | undefined;
  b: string | undefined;
}) {
  "use cache";
  cacheLife("hours");

  const parsedA = a ? parseProject(a) : null;
  const parsedB = b ? parseProject(b) : null;

  let runA: AnalysisRun | null = null;
  let runB: AnalysisRun | null = null;

  if (parsedA && parsedB) {
    [runA, runB] = (await Promise.all([
      fetchQuery(api.analysisRuns.getByRepositorySlug, parsedA),
      fetchQuery(api.analysisRuns.getByRepositorySlug, parsedB),
    ])) as [AnalysisRun | null, AnalysisRun | null];
  } else if (parsedA) {
    runA = (await fetchQuery(
      api.analysisRuns.getByRepositorySlug,
      parsedA,
    )) as AnalysisRun | null;
  } else if (parsedB) {
    runB = (await fetchQuery(
      api.analysisRuns.getByRepositorySlug,
      parsedB,
    )) as AnalysisRun | null;
  }

  const isSameProject =
    parsedA &&
    parsedB &&
    parsedA.owner === parsedB.owner &&
    parsedA.project === parsedB.project;

  const bothLoaded =
    runA !== null &&
    runB !== null &&
    runA.metrics !== null &&
    runB.metrics !== null;

  return (
    <>
      <section className="bg-surface-2">
        <Container className="py-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Compare Projects
            </h1>
            <p className="text-sm text-muted-foreground">
              Compare maintenance scores, activity, and health metrics for two
              repositories.
            </p>
          </div>
          <CompareForm initialA={a} initialB={b} />
        </Container>
      </section>

      {isSameProject && (
        <Container className="py-2">
          <p className="text-sm text-muted-foreground">
            Both fields refer to the same repository. Enter two different
            projects to compare.
          </p>
        </Container>
      )}

      {runA && runB && runA.metrics && runB.metrics && !isSameProject && (
        <>
          <CompareHeader runA={runA} runB={runB} />
          <ComparisonTable runA={runA} runB={runB} />
          <CommitActivityComparison runA={runA} runB={runB} />
        </>
      )}

      {!bothLoaded && !isSameProject && (parsedA || parsedB) && (
        <Container className="py-2">
          <p className="text-sm text-muted-foreground">
            {!runA && parsedA
              ? `${parsedA.owner}/${parsedA.project} has not been analyzed yet. Use the form above to analyze it.`
              : !runB && parsedB
                ? `${parsedB.owner}/${parsedB.project} has not been analyzed yet. Use the form above to analyze it.`
                : runA && runB && (!runA.metrics || !runB.metrics)
                  ? "Analysis is still in progress for one or both repositories. Try refreshing the page."
                  : "Enter two repositories above to compare them."}
          </p>
        </Container>
      )}
    </>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { a, b } = await searchParams;
  const normA = normalizeSlug(a);
  const normB = normalizeSlug(b);
  return <CachedComparePage a={normA?.slug} b={normB?.slug} />;
}
