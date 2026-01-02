import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Render an input element with a comprehensive set of UI utility classes, data-slot="input", and all other props forwarded.
 *
 * @param className - Optional additional CSS classes that are merged with the component's default classes
 * @param props - Remaining native input properties forwarded to the underlying element
 * @returns A JSX input element with default styling, merged `className`, `data-slot="input"`, and forwarded props
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };