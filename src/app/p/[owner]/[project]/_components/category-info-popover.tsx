"use client";

import { Info, MoreHorizontal } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { categoryColors } from "@/lib/category-styles";
import {
  MAINTENANCE_CATEGORY_INFO,
  type MaintenanceCategory,
} from "@/core/maintenance";
import { cn } from "@/lib/utils";

interface CategoryInfoPopoverProps {
  category: MaintenanceCategory;
}

export function CategoryInfoPopover({ category }: CategoryInfoPopoverProps) {
  const categoryInfo = MAINTENANCE_CATEGORY_INFO[category];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            badgeVariants(),
            "capitalize text-sm border cursor-pointer transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/60 inline-flex items-center gap-1.5",
            categoryColors[category],
          )}
          aria-label={`Show details for ${categoryInfo.label} category`}
        >
          {categoryInfo.label}
          <MoreHorizontal className="size-3.5 opacity-80" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] bg-surface-2 space-y-2"
      >
        <p className="text-sm font-semibold">{categoryInfo.label}</p>
        <p className="text-sm text-muted-foreground">
          {categoryInfo.description}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="size-3.5 shrink-0" />
          <span>{categoryInfo.recommendation}</span>
        </p>
      </PopoverContent>
    </Popover>
  );
}
