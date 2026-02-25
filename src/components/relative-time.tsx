"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

interface RelativeTimeProps {
  date: Date | string;
  addSuffix?: boolean;
  className?: string;
}

export function RelativeTime({
  date,
  addSuffix = true,
  className,
}: RelativeTimeProps) {
  const d = typeof date === "string" ? new Date(date) : date;
  const [value, setValue] = useState(() =>
    formatDistanceToNow(d, { addSuffix }),
  );

  useEffect(() => {
    setValue(formatDistanceToNow(d, { addSuffix }));
  }, [d, addSuffix]);

  return (
    <span
      data-slot="relative-time"
      className={className}
      suppressHydrationWarning
    >
      {value}
    </span>
  );
}
