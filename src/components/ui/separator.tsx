"use client";

import * as SeparatorPrimitive from "@radix-ui/react-separator";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Renders a styled separator element using Radix UI's Separator primitive.
 *
 * @param className - Additional CSS classes to apply to the separator.
 * @param orientation - Separator orientation; "horizontal" sets full width, "vertical" sets full height.
 * @param decorative - If true, marks the separator as decorative for accessibility.
 * @returns A React element rendering the composed SeparatorPrimitive.Root.
 */
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
