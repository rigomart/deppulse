"use client";

import { useAction } from "convex/react";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseProject } from "@/lib/parse-project";
import { api } from "../../../convex/_generated/api";

export function SearchForm() {
  const router = useRouter();
  const analyzeProject = useAction(api.analysis.analyzeProject);

  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

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
      const result = await analyzeProject({
        owner: parsed.owner,
        project: parsed.project,
        triggerSource: "homepage",
      });
      router.push(`/p/${result.owner}/${result.project}`);
      return;
    } catch (err) {
      console.error("analyzeProject failed:", err);
      setError("Could not start analysis. Please try again.");
    } finally {
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
