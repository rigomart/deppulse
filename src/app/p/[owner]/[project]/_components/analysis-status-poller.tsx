"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AnalysisRun } from "@/lib/domain/assessment";

interface AnalysisStatusPollerProps {
  owner: string;
  project: string;
  run: AnalysisRun;
}

function isTerminal(state: string | undefined): boolean {
  return state === "complete" || state === "failed" || state === "partial";
}

function parseStatusPayload(payload: unknown): {
  state: string | undefined;
  viewReady: boolean;
} {
  if (!payload || typeof payload !== "object") {
    return { state: undefined, viewReady: false };
  }

  const viewReady =
    "viewReady" in payload && typeof payload.viewReady === "boolean"
      ? payload.viewReady
      : false;

  if (!("latestRun" in payload) || !payload.latestRun) {
    return { state: undefined, viewReady };
  }

  const latestRun = payload.latestRun;
  if (typeof latestRun !== "object") {
    return { state: undefined, viewReady };
  }

  const state =
    "state" in latestRun && typeof latestRun.state === "string"
      ? latestRun.state
      : undefined;

  return { state, viewReady };
}

export function AnalysisStatusPoller({
  owner,
  project,
  run,
}: AnalysisStatusPollerProps) {
  const router = useRouter();
  const hasRefreshed = useRef(false);
  const [timedOut, setTimedOut] = useState(false);
  const initialState = run.runState ?? run.status;

  useEffect(() => {
    setTimedOut(false);
    if (run.id <= 0 || isTerminal(initialState)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 120;

    const poll = async () => {
      pollAttempts += 1;
      if (pollAttempts > MAX_POLL_ATTEMPTS) {
        setTimedOut(true);
        return;
      }

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

        const payload: unknown = await response.json();
        const { state, viewReady } = parseStatusPayload(payload);
        const interval = state === "waiting_retry" ? 5000 : 2000;

        if ((viewReady || isTerminal(state)) && !hasRefreshed.current) {
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

  if (!timedOut) return null;

  return (
    <p className="px-4 text-sm text-muted-foreground">
      Analysis is taking longer than expected. Please refresh in a moment.
    </p>
  );
}
