import { Container } from "@/components/container";
import { Badge } from "@/components/ui/badge";
import type { DimensionLevel } from "@/core/dimensions";
import { dimensionLevelColors } from "@/lib/category-styles";
import { cn } from "@/lib/utils";

interface DimensionSectionProps {
  title: string;
  level: DimensionLevel | null;
  delay?: string;
  children: React.ReactNode;
}

export function DimensionSection({
  title,
  level,
  delay,
  children,
}: DimensionSectionProps) {
  return (
    <Container>
      <section
        className={cn(
          "space-y-4 animate-in fade-in duration-300 fill-mode-backwards",
          delay,
        )}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </h2>
          {level && (
            <Badge
              className={cn(
                "text-xs border capitalize",
                dimensionLevelColors[level],
              )}
            >
              {level}
            </Badge>
          )}
        </div>
        {children}
      </section>
    </Container>
  );
}
