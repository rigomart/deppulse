import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("container max-w-5xl mx-auto px-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}
