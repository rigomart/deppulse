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
  const [value, setValue] = useState(() =>
    formatDistanceToNow(typeof date === "string" ? new Date(date) : date, {
      addSuffix,
    }),
  );

  useEffect(() => {
    setValue(
      formatDistanceToNow(typeof date === "string" ? new Date(date) : date, {
        addSuffix,
      }),
    );
  }, [date, addSuffix]);

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
