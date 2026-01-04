"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseProject } from "@/lib/parse-project";

/**
 * Render a search form for navigating to a GitHub repository analysis.
 *
 * Validates an "owner/project" string or GitHub URL, then navigates to the project page.
 * The project page handles data fetching and displays loading/error states.
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

    const parsed = parseProject(query);
    if (!parsed) {
      setError("Invalid format. Use 'owner/repository' or GitHub URL.");
      return;
    }

    const { owner, project } = parsed;

    // Navigate immediately - the project page handles data fetching
    startTransition(() => {
      router.push(`/p/${owner}/${project}`);
    });
  };

  return (
    <div className="w-full max-w-sm space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          name="query"
          placeholder="GitHub URL or owner/repository"
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
