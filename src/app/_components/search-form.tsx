"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { analyze } from "@/actions/analyze";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseRepo } from "@/lib/parse-repo";

/** Maps error patterns to user-friendly messages. */
function getUserFriendlyError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Analysis failed. Please try again.";
  }

  const msg = error.message.toLowerCase();

  if (msg.includes("not found") || msg.includes("404")) {
    return "Repository not found. Please check the owner and repo name.";
  }
  if (msg.includes("rate limit")) {
    return "GitHub API rate limit reached. Please try again later.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  if (msg.includes("unauthorized") || msg.includes("401")) {
    return "Authentication error. Please try again later.";
  }

  return "Analysis failed. Please try again.";
}

/**
 * Render a search form for analyzing a GitHub repository.
 *
 * Validates an "owner/repo" string or GitHub URL, starts an analysis action for the parsed repository,
 * navigates to the repository results page on success, and displays loading and error states.
 *
 * @returns The JSX element for the search form UI.
 */
export function SearchForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const query = formData.get("query") as string;

    const parsed = parseRepo(query);
    if (!parsed) {
      setError("Invalid format. Use 'owner/repo' or GitHub URL.");
      return;
    }

    const { owner, repo } = parsed;

    startTransition(async () => {
      try {
        await analyze(owner, repo);
        router.push(`/repo/${owner}/${repo}`);
      } catch (err) {
        setError(getUserFriendlyError(err));
      }
    });
  };

  return (
    <div className="w-full max-w-sm space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          name="query"
          placeholder="GitHub URL or owner/repo"
          disabled={isPending}
          required
          maxLength={200}
          className="flex-1"
          autoComplete="off"
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
