import { differenceInDays } from "date-fns";

export type Recency = "recent" | "moderate" | "aging" | "stale";

export function getRecency(date: Date, now?: Date): Recency {
  const days = differenceInDays(now ?? new Date(), date);
  if (days <= 30) return "recent";
  if (days <= 90) return "moderate";
  if (days <= 180) return "aging";
  return "stale";
}

export const recencyFillColor: Record<Recency, string> = {
  recent: "bg-status-healthy",
  moderate: "bg-status-moderate",
  aging: "bg-status-declining",
  stale: "bg-status-inactive",
};

export const recencyCssColor: Record<Recency, string> = {
  recent: "var(--status-healthy)",
  moderate: "var(--status-moderate)",
  aging: "var(--status-declining)",
  stale: "var(--status-inactive)",
};
