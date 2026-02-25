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
  const [formatted, setFormatted] = useState(() =>
    format(typeof date === "string" ? new Date(date) : date, formatStr),
  );

  useEffect(() => {
    setFormatted(
      format(typeof date === "string" ? new Date(date) : date, formatStr),
    );
  }, [date, formatStr]);

  return <span suppressHydrationWarning>{formatted}</span>;
}
