"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { AnalysisRun } from "@/lib/domain/assessment";

interface AnalysisStatusPollerProps {
  owner: string;
  project: string;
  run: AnalysisRun;
}

function isTerminal(state: string | undefined): boolean {
  return state === "complete" || state === "failed" || state === "partial";
}

export function AnalysisStatusPoller({
  owner,
  project,
  run,
}: AnalysisStatusPollerProps) {
  const router = useRouter();
  const hasRefreshed = useRef(false);
  const initialState = run.runState ?? run.status;

  useEffect(() => {
    if (run.id <= 0 || isTerminal(initialState)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/projects/${owner}/${project}/status`,
          {
            cache: "no-store",
          },
        );
        if (!response.ok) {
          timer = setTimeout(poll, 5000);
          return;
        }

        const payload = (await response.json()) as {
          latestRun: { state: string } | null;
          viewReady: boolean;
        };
        const state = payload.latestRun?.state;
        const interval = state === "waiting_retry" ? 5000 : 2000;

        if ((payload.viewReady || isTerminal(state)) && !hasRefreshed.current) {
          hasRefreshed.current = true;
          router.refresh();
          return;
        }

        if (!cancelled) {
          timer = setTimeout(poll, interval);
        }
      } catch {
        if (!cancelled) {
          timer = setTimeout(poll, 5000);
        }
      }
    };

    timer = setTimeout(poll, 2000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [initialState, owner, project, router, run.id]);

  return null;
}
