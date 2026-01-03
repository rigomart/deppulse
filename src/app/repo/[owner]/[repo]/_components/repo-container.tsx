import { Container } from "@/components/container";
import { cn } from "@/lib/utils";

export function RepoContainer({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Container className={cn("px-4", className)} {...props}>
      {children}
    </Container>
  );
}
