"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function parseAnalyzeResponse(payload: unknown): {
  error: string | null;
  redirectTo: string | null;
} {
  if (!payload || typeof payload !== "object") {
    return { error: null, redirectTo: null };
  }

  const error =
    "error" in payload && typeof payload.error === "string"
      ? payload.error
      : null;
  const redirectTo =
    "redirectTo" in payload && typeof payload.redirectTo === "string"
      ? payload.redirectTo
      : null;

  return { error, redirectTo };
}

function isSafeRedirectPath(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  return !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
}

/**
 * Render a search form for analyzing a GitHub repository.
 *
 * Sends a repository query to the analyze API, then navigates
 * to the returned project page on success.
 */
export function SearchForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const queryValue = formData.get("query");
    if (typeof queryValue !== "string") {
      setError(
        "Could not start analysis. Please verify the repository format.",
      );
      return;
    }

    setIsPending(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: queryValue }),
      });

      const payload: unknown = await response.json().catch(() => null);
      const data = parseAnalyzeResponse(payload);

      if (!response.ok || !data.redirectTo) {
        setError(
          data.error ??
            "Could not start analysis. Please verify the repository format.",
        );
        setIsPending(false);
        return;
      }

      if (!isSafeRedirectPath(data.redirectTo)) {
        setError("Could not start analysis right now. Please try again.");
        setIsPending(false);
        return;
      }

      router.push(data.redirectTo);
    } catch {
      setError("Could not start analysis right now. Please try again.");
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
