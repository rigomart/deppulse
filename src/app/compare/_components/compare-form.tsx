"use client";

import { useAction } from "convex/react";
import { ArrowRightLeft, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseProject } from "@/lib/parse-project";
import { api } from "../../../../convex/_generated/api";

interface CompareFormProps {
  initialA?: string;
  initialB?: string;
}

function buildCompareUrl(a: string, b: string) {
  const params = new URLSearchParams();
  if (a) params.set("a", a);
  if (b) params.set("b", b);
  return `/compare?${params.toString()}`;
}

export function CompareForm({ initialA, initialB }: CompareFormProps) {
  const router = useRouter();
  const analyzeProject = useAction(api.analysis.analyzeProject);

  const [valueA, setValueA] = useState(initialA ?? "");
  const [valueB, setValueB] = useState(initialB ?? "");
  const [errorA, setErrorA] = useState<string | null>(null);
  const [errorB, setErrorB] = useState<string | null>(null);
  const [pendingA, setPendingA] = useState(false);
  const [pendingB, setPendingB] = useState(false);

  const handleSwap = () => {
    setValueA(valueB);
    setValueB(valueA);
    setErrorA(null);
    setErrorB(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorA(null);
    setErrorB(null);

    const parsedA = parseProject(valueA);
    const parsedB = parseProject(valueB);

    if (!parsedA) {
      setErrorA(
        "Could not parse repository. Use format: owner/repo or a GitHub URL.",
      );
      return;
    }
    if (!parsedB) {
      setErrorB(
        "Could not parse repository. Use format: owner/repo or a GitHub URL.",
      );
      return;
    }

    setPendingA(true);
    setPendingB(true);

    try {
      const [resultA, resultB] = await Promise.all([
        analyzeProject({
          owner: parsedA.owner,
          project: parsedA.project,
          triggerSource: "homepage",
        }),
        analyzeProject({
          owner: parsedB.owner,
          project: parsedB.project,
          triggerSource: "homepage",
        }),
      ]);

      router.push(
        buildCompareUrl(
          `${resultA.owner}/${resultA.project}`,
          `${resultB.owner}/${resultB.project}`,
        ),
      );
    } catch (err) {
      console.error("Compare analysis failed:", err);
      setErrorA("Could not start analysis. Please try again.");
    } finally {
      setPendingA(false);
      setPendingB(false);
    }
  };

  const isPending = pendingA || pendingB;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
        <div className="flex-1 space-y-1">
          <Input
            type="text"
            name="a"
            placeholder="owner/repository"
            required
            maxLength={200}
            autoComplete="off"
            disabled={isPending}
            value={valueA}
            onChange={(e) => setValueA(e.target.value)}
          />
          {errorA && (
            <p className="text-xs text-destructive font-medium">{errorA}</p>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="self-center shrink-0"
          onClick={handleSwap}
          disabled={isPending}
          aria-label="Swap projects"
        >
          <ArrowRightLeft className="size-4" />
        </Button>

        <div className="flex-1 space-y-1">
          <Input
            type="text"
            name="b"
            placeholder="owner/repository"
            required
            maxLength={200}
            autoComplete="off"
            disabled={isPending}
            value={valueB}
            onChange={(e) => setValueB(e.target.value)}
          />
          {errorB && (
            <p className="text-xs text-destructive font-medium">{errorB}</p>
          )}
        </div>

        <Button type="submit" disabled={isPending} className="shrink-0">
          {isPending ? <Loader2 className="animate-spin" /> : <Search />}
          {isPending ? "Comparing..." : "Compare"}
        </Button>
      </div>
    </form>
  );
}
