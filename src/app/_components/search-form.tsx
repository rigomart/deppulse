"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Render a search form for analyzing a GitHub repository.
 *
 * Validates an "owner/project" string or GitHub URL, then navigates
 * to the project page where analysis will be triggered.
 */
export function SearchForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const query = formData.get("query") as string;

    setIsPending(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        redirectTo?: string;
      } | null;

      if (!response.ok || !data?.redirectTo) {
        setError(
          data?.error ??
            "Could not start analysis. Please verify the repository format.",
        );
        return;
      }

      router.push(data.redirectTo);
    } catch {
      setError("Could not start analysis right now. Please try again.");
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
