import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  getCategoryFromScore,
  type MaintenanceCategory,
} from "@/lib/maintenance";

const categoryColors: Record<MaintenanceCategory, string> = {
  healthy: "bg-green-500/15 text-green-400 border-green-500/30",
  moderate: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  declining: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

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
