import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { categoryColors } from "@/lib/category-styles";
import { getCategoryFromScore } from "@/lib/maintenance";

interface ScoreDisplayProps {
  score: number;
  analyzedAt: Date;
}

export function ScoreDisplay({ score, analyzedAt }: ScoreDisplayProps) {
  const category = getCategoryFromScore(score);

  return (
    <Card className="bg-surface-3 w-full sm:w-auto min-w-64">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Maintenance Score</p>
            <p className="text-xl font-semibold text-foreground">{score}/100</p>
          </div>
          <Badge
            className={`capitalize text-sm border ${categoryColors[category]}`}
          >
            {category}
          </Badge>
        </div>
        <Separator />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3 opacity-70" />
          <span>Analyzed: {analyzedAt.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
