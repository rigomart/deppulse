import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Renders a styled container element that serves as the Card root.
 *
 * @returns A div element with `data-slot="card"`, base card styling classes, and any additional `className` or props passed through.
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-4 border py-3 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders the header slot for a Card, applying layout, spacing, and responsive classes.
 *
 * @returns A `div` element with `data-slot="card-header"` and the composed className applied
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders the card's title slot with heading typography and forwards any div props.
 *
 * @returns A `div` element with `data-slot="card-title"`, base heading classes (`leading-none font-semibold`), and any additional props or `className` merged in.
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

/**
 * Renders a description slot for a Card with muted, small text styling.
 *
 * The element is a div with data-slot="card-description"; it applies base typography classes,
 * merges any provided `className`, and forwards all other div props.
 *
 * @returns A React element that serves as the card description container.
 */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

/**
 * Renders the card's action slot, positioned for action controls (e.g., top-right of the card).
 *
 * @returns A div element that serves as the card action container and applies layout classes for alignment and positioning.
 */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders the content area for a Card, applying horizontal padding and merged class names.
 *
 * @param className - Additional CSS class names to merge with the component's base classes
 * @param props - Other props forwarded to the underlying div element
 * @returns The card content container element
 */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4", className)}
      {...props}
    />
  );
}

/**
 * Footer slot for a Card layout that aligns items horizontally and provides spacing.
 *
 * @returns A div element with `data-slot="card-footer"` that applies flex alignment, horizontal padding, and conditional top padding/border, merging any provided `className` and forwarding remaining props.
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-4 [.border-t]:pt-4", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
