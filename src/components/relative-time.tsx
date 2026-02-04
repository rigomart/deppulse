"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

interface RelativeTimeProps {
  date: Date | string;
  addSuffix?: boolean;
  fallback?: string;
  className?: string;
}

export function RelativeTime({
  date,
  addSuffix = true,
  fallback = "—",
  className,
}: RelativeTimeProps) {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    const d = typeof date === "string" ? new Date(date) : date;
    setValue(formatDistanceToNow(d, { addSuffix }));
  }, [date, addSuffix]);

  return (
    <span data-slot="relative-time" className={className}>
      {value ?? fallback}
    </span>
  );
}
