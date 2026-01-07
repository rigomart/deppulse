import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getRecentAssessments } from "@/db/queries";
import {
  getCategoryFromScore,
  type MaintenanceCategory,
} from "@/lib/maintenance";
import { formatNumber } from "@/lib/utils";

const categoryColors: Record<MaintenanceCategory, string> = {
  healthy: "bg-green-500/15 text-green-400 border-green-500/30",
  moderate: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  declining: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export async function RecentAnalyses() {
  const recentAssessments = await getRecentAssessments(12);

  if (recentAssessments.length === 0) {
    return null;
  }

  return (
    <section className="bg-surface-2 animate-in fade-in duration-300 delay-200 fill-mode-backwards">
      <Container className="py-8 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Recent Analyses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentAssessments.map((assessment) => {
            const category = getCategoryFromScore(
              assessment.maintenanceScore ?? 0,
            );
            return (
              <Link
                key={assessment.id}
                href={`/p/${assessment.owner}/${assessment.repo}`}
              >
                <Card className="h-full transition-all hover:bg-surface-3">
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {assessment.avatarUrl && (
                          <Image
                            src={assessment.avatarUrl}
                            alt={`${assessment.owner} avatar`}
                            width={24}
                            height={24}
                            className="rounded-full shrink-0"
                          />
                        )}
                        <div className="text-base font-medium truncate">
                          {assessment.fullName}
                        </div>
                      </div>
                      <Badge
                        className={`capitalize shrink-0 border ${categoryColors[category]}`}
                      >
                        {category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" />
                        {formatNumber(assessment.stars ?? 0)}
                      </span>
                      {assessment.language && (
                        <span>{assessment.language}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
