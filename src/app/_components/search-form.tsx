"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseProject } from "@/lib/parse-project";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function SearchForm() {
  const router = useRouter();
  const startOrReuse = useMutation(api.analysisRuns.startOrReuse);

  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [pendingRunId, setPendingRunId] = useState<Id<"analysisRuns"> | null>(
    null,
  );
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  // Subscribe to the pending run reactively (skipped when no pending run)
  const pendingRun = useQuery(
    api.analysisRuns.getById,
    pendingRunId ? { runId: pendingRunId } : "skip",
  );

  // When the pending run advances past bootstrap, redirect
  useEffect(() => {
    if (!pendingRun || !redirectTarget) return;

    if (
      pendingRun.progressStep !== "bootstrap" &&
      pendingRun.progressStep !== "metrics"
    ) {
      router.push(redirectTarget);
    }

    // If the run failed during metrics fetch, show error
    if (pendingRun.runState === "failed") {
      setError(
        pendingRun.errorMessage ??
          "Analysis failed. Please check the repository name and try again.",
      );
      setIsPending(false);
      setPendingRunId(null);
      setRedirectTarget(null);
    }
  }, [pendingRun, redirectTarget, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const queryValue = formData.get("query");
    if (typeof queryValue !== "string" || !queryValue.trim()) {
      setError("Please enter a GitHub repository URL or owner/repo.");
      return;
    }

    const parsed = parseProject(queryValue);
    if (!parsed) {
      setError(
        "Could not parse repository. Use format: owner/repo or a GitHub URL.",
      );
      return;
    }

    setIsPending(true);
    try {
      const result = await startOrReuse({
        owner: parsed.owner,
        project: parsed.project,
        triggerSource: "homepage",
      });

      const target = `/p/${result.owner}/${result.project}`;

      if (result.alreadyComplete) {
        router.push(target);
        return;
      }

      // Subscribe to the run and wait for metrics to be fetched
      setPendingRunId(result.runId);
      setRedirectTarget(target);
    } catch (err) {
      console.error("startOrReuse failed:", err);
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Could not start analysis: ${message}`);
      setIsPending(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          name="query"
          placeholder="GitHub URL or owner/repository"
          required
          maxLength={200}
          className="flex-1"
          autoComplete="off"
          disabled={isPending}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <Search />}
          {isPending ? "Analyzing..." : "Analyze"}
        </Button>
      </form>
      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
    </div>
  );
}
