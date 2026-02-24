import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

import { Button, type buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function CtaButton({
  className,
  children,
  size,
  ...props
}: React.ComponentProps<"button"> &
  Pick<VariantProps<typeof buttonVariants>, "size">) {
  return (
    <span
      data-slot="cta-button"
      className={cn(
        "relative inline-flex p-0.5 overflow-hidden bg-border",
        props.disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      <span className="absolute inset-0 animate-border-swipe bg-linear-to-r from-transparent via-foreground to-transparent" />
      <Button
        size={size}
        className="relative bg-none bg-surface-2 text-primary-foreground hover:bg-surface-3 transition-colors duration-300"
        {...props}
      >
        {children}
      </Button>
    </span>
  );
}

export { CtaButton };
