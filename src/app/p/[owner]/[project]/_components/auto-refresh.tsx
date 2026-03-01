"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { isTerminalRunState } from "@/core/analysis/constants";
import { api } from "../../../../../../convex/_generated/api";

export function AutoRefresh({
  owner,
  project,
}: {
  owner: string;
  project: string;
}) {
  const triggerRefresh = useMutation(api.analysisRuns.triggerRefreshIfStale);
  const liveRun = useQuery(api.analysisRuns.getByRepositorySlug, {
    owner,
    project,
  });

  const toastIdRef = useRef<string | number | null>(null);
  const runIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    triggerRefresh({ owner, project })
      .then(({ refreshTriggered, runId }) => {
        if (cancelled) return;
        if (refreshTriggered && runId) {
          runIdRef.current = runId;
          toastIdRef.current = toast.loading("Refreshing analysis data...");
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
      runIdRef.current = null;
    };
  }, [owner, project, triggerRefresh]);

  useEffect(() => {
    if (!toastIdRef.current || !runIdRef.current || !liveRun) return;
    if (
      liveRun.id === runIdRef.current &&
      isTerminalRunState(liveRun.runState)
    ) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
      runIdRef.current = null;
    }
  }, [liveRun]);

  return null;
}
