"use client";

import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CONFIDENCE_LEVEL_INFO,
  type ConfidenceResult,
} from "@/core/confidence";
import { confidenceColors } from "@/lib/category-styles";
import { cn } from "@/lib/utils";

interface ConfidenceIndicatorProps {
  confidence: ConfidenceResult;
}

export function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  const info = CONFIDENCE_LEVEL_INFO[confidence.level];
  const Icon = confidence.level === "high" ? CheckCircle : AlertTriangle;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            badgeVariants(),
            "text-xs border cursor-pointer transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/60 inline-flex items-center gap-1",
            confidenceColors[confidence.level],
          )}
          aria-label={`Show details for ${info.label}`}
        >
          <Icon className="size-3 opacity-80" aria-hidden="true" />
          {info.label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] bg-surface-2 space-y-2"
      >
        <p className="text-sm font-semibold">{info.label}</p>
        <p className="text-sm text-muted-foreground">{info.description}</p>
        {confidence.penalties.length > 0 && (
          <ul className="space-y-1">
            {confidence.penalties.map((penalty) => (
              <li
                key={penalty.id}
                className="text-xs text-muted-foreground flex items-center gap-1.5"
              >
                <Info className="size-3 shrink-0" aria-hidden="true" />
                <span>{penalty.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
