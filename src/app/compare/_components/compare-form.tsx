"use client";

import { useAction } from "convex/react";
import { ArrowRightLeft, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CtaButton } from "@/components/ui/cta-button";
import { Input } from "@/components/ui/input";
import { parseProject } from "@/lib/parse-project";
import { api } from "../../../../convex/_generated/api";

interface CompareFormProps {
  initialA?: string;
  initialB?: string;
}

export function CompareForm({ initialA, initialB }: CompareFormProps) {
  const router = useRouter();
  const analyzeProject = useAction(api.analysis.analyzeProject);

  const [valueA, setValueA] = useState(initialA ?? "");
  const [valueB, setValueB] = useState(initialB ?? "");
  const [errorA, setErrorA] = useState<string | null>(null);
  const [errorB, setErrorB] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    }
    if (!parsedB) {
      setErrorB(
        "Could not parse repository. Use format: owner/repo or a GitHub URL.",
      );
    }
    if (!parsedA || !parsedB) return;

    setPending(true);

    try {
      const [resultA, resultB] = await Promise.allSettled([
        analyzeProject({
          owner: parsedA.owner,
          project: parsedA.project,
          triggerSource: "direct_visit",
        }),
        analyzeProject({
          owner: parsedB.owner,
          project: parsedB.project,
          triggerSource: "direct_visit",
        }),
      ]);

      if (resultA.status === "rejected") {
        setErrorA("Repository not found or analysis failed.");
      }
      if (resultB.status === "rejected") {
        setErrorB("Repository not found or analysis failed.");
      }

      if (resultA.status === "fulfilled" && resultB.status === "fulfilled") {
        const params = new URLSearchParams();
        params.set("a", `${resultA.value.owner}/${resultA.value.project}`);
        params.set("b", `${resultB.value.owner}/${resultB.value.project}`);
        router.push(`/compare?${params.toString()}`);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
        <div className="flex-1 space-y-1">
          <label htmlFor="compare-input-a" className="sr-only">
            Repository A
          </label>
          <Input
            type="text"
            name="a"
            id="compare-input-a"
            placeholder="owner/repository"
            required
            maxLength={200}
            autoComplete="off"
            disabled={pending}
            value={valueA}
            onChange={(e) => setValueA(e.target.value)}
            size="lg"
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
          disabled={pending}
          aria-label="Swap projects"
        >
          <ArrowRightLeft className="size-4" />
        </Button>

        <div className="flex-1 space-y-1">
          <label htmlFor="compare-input-b" className="sr-only">
            Repository B
          </label>
          <Input
            type="text"
            name="b"
            id="compare-input-b"
            placeholder="owner/repository"
            required
            maxLength={200}
            autoComplete="off"
            disabled={pending}
            value={valueB}
            onChange={(e) => setValueB(e.target.value)}
            size="lg"
          />
          {errorB && (
            <p className="text-xs text-destructive font-medium">{errorB}</p>
          )}
        </div>

        <CtaButton type="submit" disabled={pending} className="shrink-0">
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Search aria-hidden="true" />
          )}
          {pending ? "Comparing…" : "Compare"}
        </CtaButton>
      </div>
    </form>
  );
}
