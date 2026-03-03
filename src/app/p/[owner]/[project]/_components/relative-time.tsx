"use client";

import { formatDistanceToNow } from "date-fns";

interface RelativeTimeProps {
  date: Date | string | number;
}

export function RelativeTime({ date }: RelativeTimeProps) {
  const d = typeof date === "string" ? new Date(date) : date;
  return (
    <span suppressHydrationWarning>
      {formatDistanceToNow(d, { addSuffix: true })}
    </span>
  );
}
