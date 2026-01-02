"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { analyze } from "@/actions/analyze";

type Props = {
  owner: string;
  repo: string;
};

export function RefreshButton({ owner, repo }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      await analyze(owner, repo);
      router.refresh();
    });
  };

  return (
    <button type="button" onClick={handleRefresh} disabled={isPending}>
      {isPending ? "Refreshing..." : "Refresh Analysis"}
    </button>
  );
}
