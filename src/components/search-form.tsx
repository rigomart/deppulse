"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { analyze } from "@/actions/analyze";
import { parseRepo } from "@/lib/parse-repo";

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
        setError(err instanceof Error ? err.message : "Analysis failed");
      }
    });
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="query"
          placeholder="owner/repo or GitHub URL"
          disabled={isPending}
          required
        />
        <button type="submit" disabled={isPending}>
          {isPending ? "Analyzing..." : "Analyze"}
        </button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {isPending && <p>Fetching data from GitHub, please wait...</p>}
    </div>
  );
}
