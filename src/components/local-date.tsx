"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";

interface LocalDateProps {
  date: Date | string;
  formatStr?: string;
}

export function LocalDate({
  date,
  formatStr = "MMM d, yyyy 'at' h:mm a",
}: LocalDateProps) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    const d = typeof date === "string" ? new Date(date) : date;
    setFormatted(format(d, formatStr));
  }, [date, formatStr]);

  return <>{formatted ?? "—"}</>;
}
