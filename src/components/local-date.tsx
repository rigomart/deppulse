"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";

interface LocalDateProps {
  date: Date | string | number;
  formatStr?: string;
}

export function LocalDate({
  date,
  formatStr = "MMM d, yyyy 'at' h:mm a",
}: LocalDateProps) {
  const d = typeof date === "string" ? new Date(date) : date;
  const [formatted, setFormatted] = useState(() => format(d, formatStr));

  useEffect(() => {
    setFormatted(format(d, formatStr));
  }, [d, formatStr]);

  return <span suppressHydrationWarning>{formatted}</span>;
}
