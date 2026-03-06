"use client";

import { AlertTriangle, OctagonAlert } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { RedFlag } from "@/core/red-flags";
import { cn } from "@/lib/utils";

const severityConfig = {
  critical: {
    icon: OctagonAlert,
    colors: "bg-destructive/15 text-destructive border-destructive/30",
  },
  warning: {
    icon: AlertTriangle,
    colors:
      "bg-status-declining/15 text-status-declining border-status-declining/30",
  },
} as const;

function RedFlagBadge({ flag }: { flag: RedFlag }) {
  const config = severityConfig[flag.severity];
  const Icon = config.icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            badgeVariants(),
            "text-xs border cursor-pointer transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/60 inline-flex items-center gap-1",
            config.colors,
          )}
          aria-label={`Show details: ${flag.title}`}
        >
          <Icon className="size-3 opacity-80" aria-hidden="true" />
          {flag.title}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 max-w-[calc(100vw-2rem)] bg-surface-2 space-y-2"
      >
        <p className="text-sm font-semibold">{flag.title}</p>
        <p className="text-sm text-muted-foreground">{flag.description}</p>
      </PopoverContent>
    </Popover>
  );
}

export function RedFlagBadges({ flags }: { flags: RedFlag[] }) {
  if (flags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {flags.map((flag) => (
        <RedFlagBadge key={flag.id} flag={flag} />
      ))}
    </div>
  );
}
